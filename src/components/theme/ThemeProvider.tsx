"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";
import type { ComponentProps } from "react";

export type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>;

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  attribute = "class",
  defaultTheme = "dark",
  enableSystem = false,
  disableTransitionOnChange = true,
  ...props
}) => (
  <NextThemesProvider
      attribute={attribute}
      defaultTheme={defaultTheme}
      enableSystem={enableSystem}
      disableTransitionOnChange={disableTransitionOnChange}
      {...props}
  >
    {children}
  </NextThemesProvider>
);

export const useTheme = () => {
  const nextTheme = useNextTheme();
  const { theme, resolvedTheme, setTheme, ...rest } = nextTheme;

  const toggleTheme = React.useCallback(() => {
    const effectiveTheme = (resolvedTheme ?? theme) || "dark";
    setTheme(effectiveTheme === "light" ? "dark" : "light");
  }, [resolvedTheme, theme, setTheme]);

  return { theme, resolvedTheme, setTheme, toggleTheme, ...rest };
};

export default ThemeProvider;
