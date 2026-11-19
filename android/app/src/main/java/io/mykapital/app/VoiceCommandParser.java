package io.mykapital.app;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Pure text parser for the widget voice flow.
 *
 * <p>This class deliberately has no Android or JSON dependencies so the same
 * recognition contract can be covered by fast JVM unit tests.</p>
 */
final class VoiceCommandParser {
    static final String TYPE_INCOME = "income";
    static final String TYPE_EXPENSE = "expense";
    static final String TYPE_CONFLICT = "conflict";
    static final String TYPE_UNKNOWN = "unknown";

    private static final long MAX_AMOUNT_MINOR = 1_000_000_000_000_000L;
    private static final Pattern DIGIT_AMOUNT = Pattern.compile(
        "(?:^|\\s)(\\d{1,3}(?:[\\s.]\\d{3})+(?:,\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?)(?=\\s|$)"
    );
    private static final Pattern NEGATIVE_DIGIT_AMOUNT = Pattern.compile("(?:^|\\s)[−-]\\s*\\d");
    private static final Map<String, Integer> NUMBER_WORDS = new HashMap<>();
    private static final Set<String> THOUSAND_WORDS = new HashSet<>(
        Arrays.asList(
            "тысяча", "тысячи", "тысяч", "тысячу", "тыще", "тыща", "тыщи", "тыщу", "тыщ", "тыс", "thousand"
        )
    );
    private static final Set<String> HALF_NUMBER_WORDS = new HashSet<>(Arrays.asList("полтора", "полторы"));
    private static final Set<String> NEGATIVE_WORDS = new HashSet<>(Arrays.asList("минус", "minus", "negative"));
    private static final Set<String> INCOME_WORDS = new HashSet<>(Arrays.asList(
        "доход", "доходы", "зарплата", "зарплату", "зарплаты", "аванс", "премия", "премию",
        "фриланс", "продажа", "продал", "продала", "получил", "получила", "поступило", "пришло",
        "income", "salary", "advance", "bonus", "freelance", "received", "earned", "sale"
    ));
    private static final Set<String> EXPENSE_WORDS = new HashSet<>(Arrays.asList(
        "расход", "расходы", "потратил", "потратила", "купил", "купила", "оплатил", "оплатила",
        "продукты", "кафе", "такси", "транспорт", "коммуналка", "здоровье", "одежда", "связь", "досуг", "образование", "дети",
        "expense", "spent", "spend", "bought", "paid", "groceries", "cafe", "taxi", "transport", "utilities"
    ));
    private static final Set<String> FILLER_WORDS = new HashSet<>(Arrays.asList(
        "рубль", "рубля", "рублей", "руб", "р", "копейка", "копейки", "копеек",
        "доллар", "доллара", "долларов", "dollar", "dollars", "ruble", "rubles",
        "потратил", "потратила", "потрачено", "расход", "расходы", "запиши", "добавь", "внеси",
        "доход", "доходы", "получил", "получила", "поступило", "пришло", "зачисление",
        "на", "за", "с", "со", "из", "карты", "карта", "счета", "счет", "счёта", "счёт",
        "account", "card", "spent", "spend", "expense", "add", "for", "from"
    ));

    static {
        String[] ru = {
            "ноль:0", "один:1", "одна:1", "одну:1", "одно:1", "два:2", "две:2", "двух:2", "три:3", "трех:3", "четыре:4", "пять:5",
            "шесть:6", "семь:7", "восемь:8", "девять:9", "десять:10", "одиннадцать:11", "двенадцать:12", "тринадцать:13",
            "четырнадцать:14", "пятнадцать:15", "шестнадцать:16", "семнадцать:17", "восемнадцать:18", "девятнадцать:19",
            "двадцать:20", "тридцать:30", "сорок:40", "пятьдесят:50", "шестьдесят:60", "семьдесят:70", "восемьдесят:80", "девяносто:90",
            "сто:100", "двести:200", "триста:300", "четыреста:400", "пятьсот:500", "шестьсот:600", "семьсот:700", "восемьсот:800", "девятьсот:900"
        };
        String[] en = {
            "zero:0", "one:1", "two:2", "three:3", "four:4", "five:5", "six:6", "seven:7", "eight:8", "nine:9",
            "ten:10", "eleven:11", "twelve:12", "thirteen:13", "fourteen:14", "fifteen:15", "sixteen:16", "seventeen:17", "eighteen:18", "nineteen:19",
            "twenty:20", "thirty:30", "forty:40", "fifty:50", "sixty:60", "seventy:70", "eighty:80", "ninety:90", "hundred:100"
        };
        for (String item : ru) putNumber(item);
        for (String item : en) putNumber(item);
    }

    private final boolean isEnglish;

    VoiceCommandParser(boolean isEnglish) {
        this.isEnglish = isEnglish;
    }

    Result parse(String transcript, List<AccountCandidate> accounts, List<CategoryCandidate> categories) {
        String normalized = normalize(transcript);
        long amountMinor = hasNegativeAmount(transcript) ? 0L : parseAmountMinor(normalized);
        String type = detectTransactionType(normalized, categories);
        AccountCandidate account = findSpokenAccount(normalized, accounts);
        String accountId = account == null ? "" : account.id;
        String accountName = account == null ? "" : account.name;
        String knownCategory = TYPE_INCOME.equals(type) || TYPE_EXPENSE.equals(type)
            ? findKnownCategory(normalized, categories, type)
            : "";
        String category = knownCategory.isEmpty() ? deriveCategory(normalized, accountName) : knownCategory;
        return new Result(type, amountMinor, category, accountId);
    }

    private boolean hasNegativeAmount(String transcript) {
        String raw = String.valueOf(transcript == null ? "" : transcript).toLowerCase(new Locale("ru", "RU"));
        return NEGATIVE_DIGIT_AMOUNT.matcher(raw).find()
            || containsAnyWord(normalize(raw), NEGATIVE_WORDS);
    }

    private long parseAmountMinor(String normalized) {
        Matcher matcher = DIGIT_AMOUNT.matcher(normalized);
        if (matcher.find()) {
            String raw = matcher.group(1).trim();
            try {
                boolean groupedThousands = raw.matches("^\\d{1,3}(?:[\\s.]\\d{3})+(?:,\\d{1,2})?$");
                String numeric;
                if (groupedThousands) {
                    int decimalIndex = raw.lastIndexOf(',');
                    String integerPart = decimalIndex >= 0 ? raw.substring(0, decimalIndex) : raw;
                    String fractionPart = decimalIndex >= 0 ? raw.substring(decimalIndex + 1) : "";
                    numeric = integerPart.replace(" ", "").replace(".", "")
                        + (fractionPart.isEmpty() ? "" : "." + fractionPart);
                } else {
                    numeric = raw.replace(" ", "").replace(',', '.');
                }
                double value = Double.parseDouble(numeric);
                if (hasThousandSuffix(normalized, matcher.end())) value *= 1000d;
                long amountMinor = toMinorUnits(value);
                if (amountMinor > 0) return amountMinor;
            } catch (NumberFormatException ignored) {
                // Continue with word parsing below.
            }
        }

        String[] tokens = normalized.replace(',', ' ').replace('.', ' ').split("\\s+");
        double best = 0;
        int bestLength = 0;
        for (int start = 0; start < tokens.length; start += 1) {
            if (!NUMBER_WORDS.containsKey(tokens[start])
                && !THOUSAND_WORDS.contains(tokens[start])
                && !HALF_NUMBER_WORDS.contains(tokens[start])) continue;
            double current = 0;
            double total = 0;
            int end = start;
            for (; end < tokens.length; end += 1) {
                String token = tokens[end];
                if (THOUSAND_WORDS.contains(token)) {
                    total += Math.max(1, current) * 1000;
                    current = 0;
                    continue;
                }
                if (HALF_NUMBER_WORDS.contains(token)) {
                    current += 1.5d;
                    continue;
                }
                Integer value = NUMBER_WORDS.get(token);
                if (value == null) break;
                if (token.equals("hundred")) current = Math.max(1, current) * 100;
                else current += value;
            }
            double candidate = total + current;
            if (candidate > 0 && end - start > bestLength) {
                best = candidate;
                bestLength = end - start;
            }
        }
        return toMinorUnits(best);
    }

    private boolean hasThousandSuffix(String normalized, int matchEnd) {
        if (matchEnd >= normalized.length()) return false;
        String tail = normalized.substring(matchEnd).trim();
        if (tail.isEmpty()) return false;
        String token = tail.split("\\s+", 2)[0];
        return THOUSAND_WORDS.contains(token);
    }

    private long toMinorUnits(double amountMajor) {
        if (!Double.isFinite(amountMajor) || amountMajor <= 0d || amountMajor > MAX_AMOUNT_MINOR / 100d) return 0L;
        return Math.round(amountMajor * 100d);
    }

    private AccountCandidate findSpokenAccount(String transcript, List<AccountCandidate> accounts) {
        AccountCandidate best = null;
        int bestLength = 0;
        for (AccountCandidate account : safeList(accounts)) {
            if (account == null || !account.includeInSpendable) continue;
            if (containsInflectedLabel(transcript, account.name) && account.name.length() > bestLength) {
                best = account;
                bestLength = account.name.length();
            }
        }
        return best;
    }

    private String findKnownCategory(String transcript, List<CategoryCandidate> categories, String type) {
        String best = "";
        for (CategoryCandidate category : safeList(categories)) {
            if (category == null || !type.equals(category.type)) continue;
            String name = category.name.trim();
            if (name.length() > best.length() && containsInflectedLabel(transcript, name)) best = name;
        }
        return best;
    }

    private String detectTransactionType(String normalized, List<CategoryCandidate> categories) {
        boolean income = containsAnyWord(normalized, INCOME_WORDS);
        boolean expense = containsAnyWord(normalized, EXPENSE_WORDS);

        for (CategoryCandidate category : safeList(categories)) {
            if (category == null || category.name.isEmpty() || !containsInflectedLabel(normalized, category.name)) continue;
            if (TYPE_INCOME.equals(category.type)) income = true;
            if (TYPE_EXPENSE.equals(category.type)) expense = true;
        }

        if (income && expense) return TYPE_CONFLICT;
        if (income) return TYPE_INCOME;
        if (expense) return TYPE_EXPENSE;
        return TYPE_UNKNOWN;
    }

    private String deriveCategory(String normalized, String accountName) {
        String[] tokens = normalized.split("\\s+");
        String[] accountTokens = normalize(accountName).split("\\s+");
        StringBuilder result = new StringBuilder();
        for (String token : tokens) {
            if (token.isEmpty() || token.matches(".*\\d.*") || NUMBER_WORDS.containsKey(token)
                || THOUSAND_WORDS.contains(token) || HALF_NUMBER_WORDS.contains(token) || FILLER_WORDS.contains(token)
                || matchesAnyStem(token, accountTokens)) continue;
            if (result.length() > 0) result.append(' ');
            result.append(token);
            if (result.toString().split(" ").length >= 6) break;
        }
        if (result.length() == 0) return "";
        Locale locale = isEnglish ? Locale.US : new Locale("ru", "RU");
        return result.substring(0, 1).toUpperCase(locale) + result.substring(1);
    }

    private static boolean containsAnyWord(String normalized, Set<String> words) {
        for (String token : normalized.split("\\s+")) if (words.contains(token)) return true;
        return false;
    }

    private static boolean containsInflectedLabel(String text, String label) {
        String[] haystack = normalize(text).split("\\s+");
        String[] needles = normalize(label).split("\\s+");
        if (needles.length == 0) return false;
        for (String needle : needles) {
            if (needle.isEmpty()) continue;
            boolean found = false;
            for (String token : haystack) {
                if (sameStem(token, needle)) {
                    found = true;
                    break;
                }
            }
            if (!found) return false;
        }
        return true;
    }

    private static boolean matchesAnyStem(String token, String[] candidates) {
        for (String candidate : candidates) if (sameStem(token, candidate)) return true;
        return false;
    }

    private static boolean sameStem(String left, String right) {
        if (left.equals(right)) return true;
        if (left.length() < 4 || right.length() < 4) return false;
        int stem = Math.min(5, Math.min(left.length() - 1, right.length() - 1));
        return left.substring(0, stem).equals(right.substring(0, stem));
    }

    private static String normalize(String value) {
        return String.valueOf(value == null ? "" : value)
            .toLowerCase(new Locale("ru", "RU"))
            .replace('ё', 'е')
            .replaceAll("[^\\p{L}\\p{N}.,]+", " ")
            .replaceAll("(?<=\\d)(?=\\p{L})|(?<=\\p{L})(?=\\d)", " ")
            .trim()
            .replaceAll("\\s+", " ");
    }

    private static void putNumber(String encoded) {
        String[] parts = encoded.split(":");
        NUMBER_WORDS.put(parts[0], Integer.parseInt(parts[1]));
    }

    private static <T> List<T> safeList(List<T> items) {
        return items == null ? Collections.emptyList() : items;
    }

    static final class AccountCandidate {
        final String id;
        final String name;
        final boolean includeInSpendable;

        AccountCandidate(String id, String name, boolean includeInSpendable) {
            this.id = id == null ? "" : id;
            this.name = name == null ? "" : name;
            this.includeInSpendable = includeInSpendable;
        }
    }

    static final class CategoryCandidate {
        final String type;
        final String name;

        CategoryCandidate(String type, String name) {
            this.type = type == null ? "" : type;
            this.name = name == null ? "" : name;
        }
    }

    static final class Result {
        final String type;
        final long amountMinor;
        final String category;
        final String accountId;

        Result(String type, long amountMinor, String category, String accountId) {
            this.type = type;
            this.amountMinor = amountMinor;
            this.category = category;
            this.accountId = accountId;
        }
    }
}
