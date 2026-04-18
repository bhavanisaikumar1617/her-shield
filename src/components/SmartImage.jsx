import { useEffect, useMemo, useState } from 'react'

const DEFAULT_PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1600&q=80'

function addCacheBust(url) {
  if (!url || typeof url !== 'string' || url.startsWith('data:')) {
    return url
  }

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}t=${Date.now()}`
}

function SmartImage({
  src,
  fallbackSrc,
  alt,
  className,
  placeholderSrc = DEFAULT_PLACEHOLDER_IMAGE,
  preventCache = false,
  ...props
}) {
  const primarySrc = useMemo(() => (preventCache ? addCacheBust(src) : src), [preventCache, src])
  const secondarySrc = useMemo(
    () => (preventCache ? addCacheBust(fallbackSrc) : fallbackSrc),
    [fallbackSrc, preventCache]
  )

  const [imgSrc, setImgSrc] = useState(primarySrc)

  useEffect(() => {
    setImgSrc(primarySrc)
  }, [primarySrc])

  const handleError = () => {
    if (secondarySrc && imgSrc !== secondarySrc) {
      setImgSrc(secondarySrc)
      return
    }

    if (imgSrc !== placeholderSrc) {
      setImgSrc(placeholderSrc)
    }
  }

  return <img src={imgSrc} alt={alt} className={className} loading="lazy" onError={handleError} {...props} />
}

export default SmartImage