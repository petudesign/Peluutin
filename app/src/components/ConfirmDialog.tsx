interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel,
  danger = true,
  secondaryActionLabel,
  onSecondaryAction,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = `confirm-${title.toLocaleLowerCase("fi-FI").replaceAll(/[^a-z0-9åäö]+/g, "-")}`;
  return (
    <div className="modal-backdrop confirmation-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <section className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={`${titleId}-description`}>
        <span className="eyebrow">VARMISTUS</span>
        <h2 id={titleId}>{title}</h2>
        <p id={`${titleId}-description`}>{description}</p>
        <div className="confirm-actions">
          <button className="secondary" onClick={onCancel}>{cancelLabel}</button>
          <button className={danger ? "danger-confirm" : ""} onClick={onConfirm}>{confirmLabel}</button>
        </div>
        {secondaryActionLabel && onSecondaryAction && (
          <button className="confirm-tertiary danger" onClick={onSecondaryAction}>{secondaryActionLabel}</button>
        )}
      </section>
    </div>
  );
}
