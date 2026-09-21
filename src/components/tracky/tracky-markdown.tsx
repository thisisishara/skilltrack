"use client"

import { Streamdown } from "streamdown"

import { cn } from "@/lib/utils"

import "streamdown/styles.css"

export function TrackyMarkdown({
  children,
  isAnimating = false,
  className,
}: {
  children: string
  isAnimating?: boolean
  className?: string
}) {
  return (
    <Streamdown
      animated={isAnimating}
      isAnimating={isAnimating}
      className={cn(
        "text-sm leading-relaxed [&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
        "[&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-4",
        "[&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-4",
        "[&_li]:my-0.5",
        "[&_strong]:font-semibold",
        "[&_a]:underline [&_a]:underline-offset-2",
        "[&_h1]:mt-2 [&_h1]:mb-1 [&_h1]:text-sm [&_h1]:font-semibold",
        "[&_h2]:mt-2 [&_h2]:mb-1 [&_h2]:text-sm [&_h2]:font-semibold",
        "[&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-medium",
        "[&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-xs",
        "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-2",
        "[&_blockquote]:my-1.5 [&_blockquote]:border-l-2 [&_blockquote]:pl-2 [&_blockquote]:text-muted-foreground",
        className
      )}
    >
      {children}
    </Streamdown>
  )
}
