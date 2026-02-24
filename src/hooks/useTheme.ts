import { useState, useEffect } from 'react';

/**
 * Returns true if the current theme is 'light' (the .light class is on document.documentElement).
 * Reactively updates whenever the theme changes.
 */
export function useIsLightTheme(): boolean {
    const getIsLight = () =>
        typeof document !== 'undefined' &&
        document.documentElement.classList.contains('light');

    const [isLight, setIsLight] = useState(getIsLight);

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsLight(getIsLight());
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });
        return () => observer.disconnect();
    }, []);

    return isLight;
}
