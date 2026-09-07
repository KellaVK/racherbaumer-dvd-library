export default function Notice({ tone = 'info', title, children }) {
  return <div className={`notice notice-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
    {title && <strong>{title}</strong>}
    <div>{children}</div>
  </div>
}
