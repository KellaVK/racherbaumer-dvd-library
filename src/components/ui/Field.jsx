import { useId } from 'react'

export default function Field({ label, error, hint, required, children, htmlFor }) {
  const generatedId = useId()
  const id = htmlFor || generatedId
  const helpId = `${id}-help`
  const child = typeof children === 'function'
    ? children({ id, 'aria-describedby': (error || hint) ? helpId : undefined, 'aria-invalid': !!error })
    : children
  return <div className="field">
    <label className="label" htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>
    {child}
    {(error || hint) && <p id={helpId} className={error ? 'field-error' : 'field-hint'}>{error || hint}</p>}
  </div>
}
