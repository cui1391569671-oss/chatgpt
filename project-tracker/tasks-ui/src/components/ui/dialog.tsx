import {closeSelectOnEscape} from '@/components/workspace-select-escape';
import {restoreWorkspaceFocus} from '@/components/workspace-return-focus';
import {motionTiming,useWorkspaceMotionOff} from '@/workspace-motion-policy';
'use client'

import * as React from 'react'
import * as DialogPrimitive from '@animate-ui/react/primitives/radix-ui/dialog'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot='dialog' {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot='dialog-trigger' {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot='dialog-portal' {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot='dialog-close' {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  const motionOff=useWorkspaceMotionOff();
  return (
    <DialogPrimitive.Overlay
      transition={{duration:motionOff?0:motionTiming.control/1000}}
      data-ui-portal='' data-slot='dialog-overlay'
      className={cn(
        'fixed inset-0 z-50 bg-black/50',
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  onCloseAutoFocus,
  onEscapeKeyDown,
  returnFocus,
  returnFocusFallback,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  returnFocus?: () => HTMLElement | null | undefined
  returnFocusFallback?: () => HTMLElement | null | undefined
}) {
  const motionOff=useWorkspaceMotionOff();
  return (
    <DialogPortal data-slot='dialog-portal'>
      <DialogOverlay />
      <DialogPrimitive.Content
        transition={{type:"tween",duration:motionOff?0:motionTiming.control/1000}} exitTransition={{type:"tween",duration:motionOff?0:motionTiming.exit/1000}}
        data-ui-portal='' data-slot='dialog-content'
        className={cn(
          'workspace-dialog',
          className
        )}
        {...props}
        onEscapeKeyDown={event => {
          if (!closeSelectOnEscape(event)) onEscapeKeyDown?.(event)
        }}
        onCloseAutoFocus={event => {
          onCloseAutoFocus?.(event)
          restoreWorkspaceFocus(event,[returnFocus,returnFocusFallback])
        }}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot='dialog-close'
            className="absolute inset-e-4 top-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className='sr-only'>关闭</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='dialog-header'
      className={cn('flex flex-col gap-2 text-center sm:text-start', className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='dialog-footer'
      className={cn(
        'flex flex-row flex-wrap gap-2 justify-end',
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot='dialog-title'
      className={cn('text-lg leading-none font-semibold', className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot='dialog-description'
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
