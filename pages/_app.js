import { useEffect } from 'react';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // 全局样式重置
    const style = document.createElement('style');
    style.textContent = `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
      }
      
      html {
        scroll-behavior: smooth;
      }
    `;
    document.head.appendChild(style);
  }, []);

  return <Component {...pageProps} />;
}