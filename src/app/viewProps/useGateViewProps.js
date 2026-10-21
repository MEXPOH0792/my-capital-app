import { useMemo } from 'react';
import { buildLockProps, buildOnboardingProps } from './gateProps.js';

export function useGateViewProps({
  copy,
  isEnglish,
  store,
  theme,
  security,
  panelStyle,
  softPanelStyle,
  formatInput,
  fmt,
  allocationModes,
  onboarding,
}) {
  const onboardingProps = useMemo(
    () =>
      buildOnboardingProps({
        copy,
        isEnglish,
        store,
        theme,
        panelStyle,
        softPanelStyle,
        formatInput,
        fmt,
        allocationModes,
        onboarding,
      }),
    [copy, isEnglish, store, theme, panelStyle, softPanelStyle, formatInput, fmt, allocationModes, onboarding],
  );

  const lockProps = useMemo(
    () => buildLockProps({ isEnglish, store, theme, security }),
    [isEnglish, store, theme, security],
  );

  return { onboardingProps, lockProps };
}
