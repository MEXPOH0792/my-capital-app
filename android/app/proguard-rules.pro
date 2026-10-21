# Keep line numbers for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Capacitor: keep WebView JavaScript interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep the SystemUiBridge inner class members so secureStorage* methods stay reachable from WebView
-keepclassmembers class io.mykapital.app.MainActivity$SystemUiBridge {
    public *;
}
-keep class io.mykapital.app.MainActivity { *; }

# Capacitor framework
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod <methods>;
}

# Cordova plugins (loaded reflectively)
-keep class org.apache.cordova.** { *; }

# AndroidX & Kotlin metadata
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**

# Keep enum methods used via reflection
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}
