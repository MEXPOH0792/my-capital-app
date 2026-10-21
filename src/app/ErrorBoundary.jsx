import React from 'react';
import { recordDiagnosticError } from '../utils/diagnostics.js';
import { APP_VERSION } from './appVersion.js';

const FALLBACK_TEXT = {
  ru: {
    title: 'Что-то пошло не так',
    body: 'Приложение остановилось из-за ошибки. Данные хранятся локально и не потеряны. Перезагрузи приложение или экспортируй бэкап, чтобы передать его в поддержку.',
    reload: 'Перезагрузить',
    copy: 'Скопировать ошибку',
    copied: 'Скопировано',
    version: 'Версия',
  },
  en: {
    title: 'Something went wrong',
    body: 'The app stopped due to an error. Your data is stored locally and was not lost. Reload the app or export a backup to share with support.',
    reload: 'Reload',
    copy: 'Copy error',
    copied: 'Copied',
    version: 'Version',
  },
};

const detectLanguage = () => {
  if (typeof navigator === 'undefined') return 'ru';
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'ru';
};

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, copied: false };
  }

  static getDerivedStateFromError(error) {
    return { error, copied: false };
  }

  componentDidCatch(error, info) {
    if (typeof console !== 'undefined') {
      console.error('[ErrorBoundary]', error, info);
    }
    // Persist into the diagnostics buffer so the user can later attach the
    // last few crashes to a support log.
    try {
      recordDiagnosticError(error);
    } catch {
      /* never throw from componentDidCatch */
    }
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleCopy = async () => {
    const { error } = this.state;
    if (!error) return;
    const payload = `${error.name}: ${error.message}\n${error.stack || ''}\nApp v${APP_VERSION}`;
    try {
      await navigator.clipboard?.writeText(payload);
      this.setState({ copied: true });
    } catch {
      this.setState({ copied: true });
    }
  };

  render() {
    const { error, copied } = this.state;
    if (!error) return this.props.children;

    const lang = detectLanguage();
    const text = FALLBACK_TEXT[lang];

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#020402',
          color: '#E6F2EB',
          padding: '24px',
          overflow: 'auto',
          fontFamily: "'Golos Text','Segoe UI',sans-serif",
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ maxWidth: 480, width: '100%' }}>
          <p
            style={{
              fontSize: 10,
              letterSpacing: '0.22em',
              opacity: 0.55,
              margin: 0,
              color: '#42B741',
            }}
          >
            {text.version} {APP_VERSION}
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '12px 0 16px', letterSpacing: '-0.03em' }}>
            {text.title}
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.55, opacity: 0.8, marginBottom: 20 }}>{text.body}</p>
          <pre
            style={{
              fontSize: 11,
              lineHeight: 1.4,
              padding: 12,
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              backgroundColor: 'rgba(255,255,255,0.03)',
              maxHeight: 200,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0,
            }}
          >
            {error.name}: {error.message}
          </pre>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                flex: 1,
                padding: '14px 16px',
                borderRadius: 16,
                border: 'none',
                backgroundColor: '#42B741',
                color: '#fff',
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: '0.18em',
                cursor: 'pointer',
              }}
            >
              {text.reload}
            </button>
            <button
              type="button"
              onClick={this.handleCopy}
              style={{
                flex: 1,
                padding: '14px 16px',
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.12)',
                backgroundColor: 'transparent',
                color: '#E6F2EB',
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: '0.18em',
                cursor: 'pointer',
              }}
            >
              {copied ? text.copied : text.copy}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
