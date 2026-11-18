import { X } from 'lucide-react';
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
            className={`m-auto max-h-[90vh] w-[calc(100%-2rem)] overflow-hidden rounded-2xl border border-[#D8E2E6] bg-white p-0 text-left shadow-2xl backdrop:bg-[#0F2933]/55 backdrop:backdrop-blur-[2px] ${MAX_WIDTH_CLASS[maxWidth]}`}
        >
            {open && (
                <div className="flex max-h-[90vh] w-full flex-col overflow-hidden">
                    <div className="flex items-start justify-between gap-4 border-b border-[#D8E2E6] px-5 py-4 sm:px-6">
                        <div className="min-w-0">
                            <h2
                                id={titleId}
                                className="text-base font-bold tracking-tight text-[#0F172A]"
                            >
                                {title}
                            </h2>
                            {subtitle && (
                                <p className="mt-0.5 text-xs text-[#5B697A]">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={closeDisabled}
                            aria-label="Tutup dialog"
                            className="inline-flex min-h-[2.25rem] min-w-[2.25rem] shrink-0 items-center justify-center rounded-lg p-1.5 text-[#5B697A] transition hover:bg-[#F8FAFC] hover:text-[#0F172A] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <X className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
                        {children}
                    </div>

                    {footer && (
                        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 border-t border-[#D8E2E6] bg-[#F8FAFC] px-5 py-3.5 sm:px-6">
                            {footer}
                        </div>
                    )}
                </div>
            )}
        </dialog>
    );
}
