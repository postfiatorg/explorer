import { FC, CSSProperties } from 'react'
import './skeleton.scss'

interface SkeletonProps {
  variant?: 'text' | 'rect' | 'circle' | 'card'
  width?: string | number
  height?: string | number
  className?: string
  style?: CSSProperties
}

export const Skeleton: FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className = '',
  style,
}) => {
  const computedStyle: CSSProperties = { ...style }
  if (width) computedStyle.width = typeof width === 'number' ? `${width}px` : width
  if (height) computedStyle.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={`skeleton skeleton-${variant} ${className}`}
      style={computedStyle}
    />
  )
}
