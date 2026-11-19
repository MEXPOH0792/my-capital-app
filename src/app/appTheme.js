export const THEMES = {
  dark: {
    bg: '#020402',
    surface: '#0D130E',
    surfaceSoft: 'rgba(230,242,235,0.06)',
    textPrimary: '#E6F2EB',
    textSecondary: '#9FC3A9',
    treeGlow: '#42B741',
    treeSick: '#E05B5B',
    border: 'rgba(159,195,169,0.14)',
    accent: '#42B741',
    sidebarBg: 'rgba(7, 12, 8, 0.94)',
    pageGradient:
      'radial-gradient(circle at top, rgba(66,183,65,0.16), rgba(2,4,2,0) 34%), linear-gradient(180deg, #020402 0%, #071008 48%, #0A140C 100%)',
    panelShadow: '0 18px 40px rgba(0,0,0,0.24)',
  },
  light: {
    bg: '#EFF5EF',
    surface: '#FBFDF9',
    surfaceSoft: 'rgba(45,122,50,0.08)',
    textPrimary: '#12291A',
    textSecondary: '#5C7361',
    treeGlow: '#42B741',
    treeSick: '#D95757',
    border: 'rgba(18,41,26,0.10)',
    accent: '#2F8A37',
    sidebarBg: 'rgba(251, 253, 249, 0.94)',
    pageGradient:
      'radial-gradient(circle at top, rgba(255,255,255,0.98), rgba(239,245,239,0) 34%), linear-gradient(180deg, #FBFDF9 0%, #F3F8F3 45%, #EAF2EA 100%)',
    panelShadow: '0 20px 42px rgba(18,41,26,0.08)',
  },
};

export function getThemeStyles(theme, isDarkMode) {
  const panelStyle = { backgroundColor: theme.surface, borderColor: theme.border, boxShadow: theme.panelShadow };
  const softPanelStyle = { backgroundColor: theme.surfaceSoft, borderColor: theme.border };
  const selectFieldStyle = {
    ...softPanelStyle,
    backgroundColor: theme.surface,
    color: theme.textPrimary,
    WebkitTextFillColor: theme.textPrimary,
    caretColor: theme.textPrimary,
    colorScheme: isDarkMode ? 'dark' : 'light',
  };
  const selectOptionStyle = {
    color: theme.textPrimary,
    backgroundColor: theme.surface,
  };
  const rootStyle = {
    backgroundColor: theme.bg,
    color: theme.textPrimary,
    backgroundImage: theme.pageGradient,
  };

  return {
    panelStyle,
    softPanelStyle,
    selectFieldStyle,
    selectOptionStyle,
    rootStyle,
  };
}
