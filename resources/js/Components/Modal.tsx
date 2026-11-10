import {
    useEffect,
    useId,
    useRef,
    type PointerEvent,
    type ReactNode,
} from 'react';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    closeDisabled?: boolean;
    children: ReactNode;
    footer?: ReactNode;
}

const MAX_WIDTH_CLASS: Record<NonNullable<ModalProps['maxWidth']>, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
};

function isPointerOutsideDialog(
    clientX: number,
    clientY: number,
    dialog: HTMLDialogElement,
): boolean {
    const rect = dialog.getBoundingClientRect();

    return (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
    );
}

export default function Modal({
    open,
    onClose,
    title,
    subtitle,
    maxWidth = 'lg',
    closeDisabled = false,
    children,
    footer,
}: ModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const pressedOutsideRef = useRef(false);
    const titleId = useId();

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) {
            return;
        }

        if (open) {
            if (!dialog.open) {
                dialog.showModal();
            }
        } else if (dialog.open) {
            dialog.close();
        }
    }, [open]);

    const handlePointerDown = (event: PointerEvent<HTMLDialogElement>) => {
        const dialog = dialogRef.current;
        if (!dialog || closeDisabled || 'closedBy' in dialog) {
            pressedOutsideRef.current = false;
            return;
        }

        pressedOutsideRef.current = isPointerOutsideDialog(
            event.clientX,
            event.clientY,
            dialog,
        );
    };

    const handlePointerUp = (event: PointerEvent<HTMLDialogElement>) => {
        const dialog = dialogRef.current;
        if (!dialog || closeDisabled || 'closedBy' in dialog) {
            pressedOutsideRef.current = false;
            return;
        }

        const releasedOutside = isPointerOutsideDialog(
            event.clientX,
            event.clientY,
            dialog,
        );

        if (pressedOutsideRef.current && releasedOutside) {
            onClose();
        }

        pressedOutsideRef.current = false;
    };

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby={titleId}
            {...({
                closedby: closeDisabled ? 'none' : 'any',
            } as Record<string, string>)}
            onCancel={(event) => {
                event.preventDefault();
                if (!closeDisabled) {
                    onClose();
                }
            }}
            onClose={() => {
                if (open && !closeDisabled) {
                    onClose();
                }
            }}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            className={`m-auto max-h-[90vh] w-[calc(100%-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-left shadow-xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-xs ${MAX_WIDTH_CLASS[maxWidth]}`}
        >
            {open && (
                <div className="flex max-h-[90vh] w-full flex-col overflow-hidden">
                    <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
                        <div>
                            <h2
                                id={titleId}
                                className="text-base font-semibold text-slate-900"
                            >
                                {title}
                            </h2>
                            {subtitle && (
                                <p className="mt-0.5 text-xs text-slate-500">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={closeDisabled}
                            aria-label="Tutup dialog"
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <svg
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                aria-hidden="true"
                            >
                                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                            </svg>
                        </button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                        {children}
                    </div>

                    {footer && (
                        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3.5">
                            {footer}
                        </div>
                    )}
                </div>
            )}
        </dialog>
    );
}
