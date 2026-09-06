import { useState } from 'react'

export function CopyLinkButton({
  label,
  url,
  className = 'btn-secondary',
}: {
  label: string
  url: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy this link:', url)
    }
  }

  return (
    <button type="button" className={className} onClick={copy}>
      {copied ? 'Copied!' : label}
    </button>
  )
}
