'use client';

/**
 * Typography - Consistent typography components following design system
 * 
 * DESIGN COMPLIANCE:
 * - Typography scale dan styling dari chat-page-styleguide.md
 * - Consistent font weights, line heights, dan color usage
 * - Support untuk academic content display dan readability
 * - Theme-aware text colors dengan proper contrast ratios
 */

import React from 'react';

interface TypographyProps {
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
  variant?: 'display' | 'heading' | 'subheading' | 'body' | 'caption' | 'code';
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: 'primary' | 'secondary' | 'muted' | 'accent' | 'success' | 'warning' | 'error';
  align?: 'left' | 'center' | 'right' | 'justify';
  truncate?: boolean;
  italic?: boolean;
  underline?: boolean;
}

// Typography variants dengan predefined styling
const TYPOGRAPHY_VARIANTS = {
  display: {
    defaultSize: '3xl',
    defaultWeight: 'bold',
    className: 'leading-tight tracking-tight',
  },
  heading: {
    defaultSize: 'xl',
    defaultWeight: 'semibold',
    className: 'leading-tight',
  },
  subheading: {
    defaultSize: 'lg',
    defaultWeight: 'medium',
    className: 'leading-relaxed',
  },
  body: {
    defaultSize: 'base',
    defaultWeight: 'normal',
    className: 'leading-relaxed',
  },
  caption: {
    defaultSize: 'sm',
    defaultWeight: 'normal',
    className: 'leading-normal',
  },
  code: {
    defaultSize: 'sm',
    defaultWeight: 'normal',
    className: 'font-mono leading-normal',
  },
} as const;

// Size classes (Tailwind-based dari style guide)
const SIZE_CLASSES = {
  xs: 'text-xs',      // 12px
  sm: 'text-sm',      // 14px
  base: 'text-base',  // 16px - default
  lg: 'text-lg',      // 18px
  xl: 'text-xl',      // 20px
  '2xl': 'text-2xl',  // 24px
  '3xl': 'text-3xl',  // 30px
} as const;

// Weight classes
const WEIGHT_CLASSES = {
  normal: 'font-normal',     // 400
  medium: 'font-medium',     // 500
  semibold: 'font-semibold', // 600
  bold: 'font-bold',         // 700
} as const;

// Color classes (theme-aware)
const COLOR_CLASSES = {
  primary: 'text-gray-800 dark:text-gray-200',
  secondary: 'text-gray-700 dark:text-gray-300',
  muted: 'text-gray-600 dark:text-gray-400',
  accent: 'text-primary-600 dark:text-primary-400',
  success: 'text-green-700 dark:text-green-400',
  warning: 'text-warning-700 dark:text-warning-400',
  error: 'text-red-700 dark:text-red-400',
} as const;

// Alignment classes
const ALIGN_CLASSES = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
} as const;

export const Typography: React.FC<TypographyProps> = ({
  children,
  className = '',
  as = 'p',
  variant = 'body',
  size,
  weight,
  color = 'primary',
  align = 'left',
  truncate = false,
  italic = false,
  underline = false,
}) => {
  const Component = as;
  const variantConfig = TYPOGRAPHY_VARIANTS[variant];
  
  // Resolve size dan weight dengan fallbacks
  const resolvedSize = size || variantConfig.defaultSize;
  const resolvedWeight = weight || variantConfig.defaultWeight;
  
  // Build class names
  const classes = [
    // Base variant classes
    variantConfig.className,
    // Size
    SIZE_CLASSES[resolvedSize],
    // Weight
    WEIGHT_CLASSES[resolvedWeight],
    // Color
    COLOR_CLASSES[color],
    // Alignment
    ALIGN_CLASSES[align],
    // Modifiers
    truncate && 'truncate',
    italic && 'italic',
    underline && 'underline',
    // Custom classes
    className,
  ].filter(Boolean).join(' ');

  return (
    <Component className={classes}>
      {children}
    </Component>
  );
};

// Specialized typography components
export const Heading: React.FC<Omit<TypographyProps, 'variant'> & { level?: 1 | 2 | 3 | 4 | 5 | 6 }> = ({
  level = 1,
  size,
  ...props
}) => {
  const headingElement = `h${level}` as const;
  const defaultSize = level <= 2 ? '2xl' : level <= 4 ? 'xl' : 'lg';
  
  return (
    <Typography
      {...props}
      as={headingElement}
      variant="heading"
      size={size || defaultSize}
    />
  );
};

export const Display: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant="display" />
);

export const Subheading: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant="subheading" />
);

export const Body: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant="body" />
);

export const Caption: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant="caption" />
);

export const Code: React.FC<Omit<TypographyProps, 'variant'> & { inline?: boolean }> = ({ 
  inline = true, 
  className = '',
  ...props 
}) => (
  <Typography 
    {...props}
    variant="code"
    as={inline ? 'span' : 'div'}
    className={`${inline ? 'bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded' : 'bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-x-auto'} ${className}`}
  />
);

// Academic content specific components
export const AcademicTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <Heading 
    level={1}
    size="2xl"
    weight="bold"
    color="primary"
    align="center"
    className={`mb-4 ${className}`}
  >
    {children}
  </Heading>
);

export const SectionTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
  level?: 2 | 3 | 4;
}> = ({ children, className = '', level = 2 }) => (
  <Heading 
    level={level}
    weight="semibold"
    color="primary"
    className={`mt-6 mb-3 ${className}`}
  >
    {children}
  </Heading>
);

export const Paragraph: React.FC<{
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'base' | 'lg';
}> = ({ children, className = '', size = 'base' }) => (
  <Body 
    size={size}
    className={`mb-4 leading-relaxed ${className}`}
  >
    {children}
  </Body>
);

export const Quote: React.FC<{
  children: React.ReactNode;
  author?: string;
  className?: string;
}> = ({ children, author, className = '' }) => (
  <blockquote className={`border-l-4 border-primary-500 pl-4 py-2 my-4 bg-primary-50 dark:bg-primary-900 ${className}`}>
    <Body className="italic mb-2">&quot;{children}&quot;</Body>
    {author && (
      <Caption color="muted" className="text-right">
        — {author}
      </Caption>
    )}
  </blockquote>
);

export const List: React.FC<{
  children: React.ReactNode;
  ordered?: boolean;
  className?: string;
}> = ({ children, ordered = false, className = '' }) => {
  const Component = ordered ? 'ol' : 'ul';
  return (
    <Component className={`${ordered ? 'list-decimal' : 'list-disc'} list-inside space-y-1 mb-4 ${className}`}>
      {children}
    </Component>
  );
};

export const ListItem: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <li className={`text-gray-700 dark:text-gray-300 ${className}`}>
    {children}
  </li>
);

// Status dan badge typography
export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'base';
  className?: string;
}> = ({ children, variant = 'default', size = 'base', className = '' }) => {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    primary: 'bg-primary-100 text-primary-700 dark:bg-primary-800 dark:text-primary-300',
    success: 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300',
    warning: 'bg-warning-100 text-warning-700 dark:bg-warning-800 dark:text-warning-300',
    error: 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-300',
  };
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    base: 'text-sm px-2 py-1',
  };
  
  return (
    <Caption
      as="span"
      className={`inline-flex items-center rounded-full font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </Caption>
  );
};

// Link component dengan proper styling
export const Link: React.FC<{
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  external?: boolean;
  className?: string;
}> = ({ children, href, onClick, external = false, className = '' }) => {
  const linkProps = href ? {
    href,
    target: external ? '_blank' : undefined,
    rel: external ? 'noopener noreferrer' : undefined,
  } : {};
  
  return (
    <a
      {...linkProps}
      onClick={onClick}
      className={`text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 underline transition-colors cursor-pointer ${className}`}
    >
      {children}
      {external && <span className="ml-1 text-xs">↗</span>}
    </a>
  );
};

export default Typography;
