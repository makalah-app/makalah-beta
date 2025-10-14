"use client";

import * as React from "react";
import { Avatar, AvatarFallback } from "./avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  /** User initials to display */
  initials: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

const UserAvatar = React.forwardRef<
  React.ElementRef<typeof Avatar>,
  UserAvatarProps
>(({ initials, size = 'md', className, ...props }, ref) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <Avatar
      ref={ref}
      className={cn(sizeClasses[size], className)}
      {...props}
    >
      <AvatarFallback
        className={cn(
          'avatar-green-solid text-success-foreground font-semibold',
          textSizeClasses[size]
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
});

UserAvatar.displayName = "UserAvatar";

export { UserAvatar };
