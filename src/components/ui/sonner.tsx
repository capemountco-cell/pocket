import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * How long a message stays up.
 *
 * Sonner's own default is four seconds, which is a long time to leave a panel
 * sitting over the top of the screen for something as small as "Link copied".
 * Every toast in this app is a short confirmation of something the person just
 * did deliberately -- they know what they did, and the message is an
 * acknowledgement rather than information they have to read.
 */
const TOAST_MS = 2500;

const Toaster = ({ toastOptions, ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        duration: TOAST_MS,
        ...toastOptions,
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          ...toastOptions?.classNames,
        },
      }}
      {...props}
    />
  );
};

export { Toaster, TOAST_MS };
