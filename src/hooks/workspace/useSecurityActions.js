export function useSecurityActions({ isEnglish, security, securityForm, setSecurityForm, setSecurityNotice }) {
  const saveSecurityPin = async () => {
    const normalizedPin = String(securityForm.pin || '').replace(/\D/g, '');
    const normalizedConfirm = String(securityForm.confirmPin || '').replace(/\D/g, '');

    if (!/^\d{4,6}$/.test(normalizedPin)) {
      setSecurityNotice(isEnglish ? 'PIN must contain 4 to 6 digits.' : 'PIN должен содержать от 4 до 6 цифр.');
      return;
    }

    if (normalizedPin !== normalizedConfirm) {
      setSecurityNotice(isEnglish ? 'PIN confirmation does not match.' : 'Подтверждение PIN не совпадает.');
      return;
    }

    await security.enablePin(normalizedPin);
    setSecurityForm({ pin: '', confirmPin: '' });
    setSecurityNotice(isEnglish ? 'PIN protection enabled.' : 'Защита PIN включена.');
  };

  const clearSecurityPin = () => {
    const confirmed = window.confirm(
      isEnglish ? 'Disable PIN protection for this device?' : 'Выключить защиту PIN на этом устройстве?',
    );
    if (!confirmed) return;
    security.disablePin();
    setSecurityForm({ pin: '', confirmPin: '' });
    setSecurityNotice(isEnglish ? 'PIN protection disabled.' : 'Защита PIN выключена.');
  };

  const lockAppNow = () => {
    security.lockNow();
    setSecurityNotice('');
  };

  return {
    saveSecurityPin,
    clearSecurityPin,
    lockAppNow,
  };
}
