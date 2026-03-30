import { useState, useEffect, useRef } from 'react'
import './Loader.css'
import logoSrc from '../assets/Logo/EG.png'

const Loader = ({ onComplete }) => {
  const [progress, setProgress] = useState(0)
  const [textIndex, setTextIndex] = useState(0)
  const [fadeOut, setFadeOut] = useState(false)
  const [logoLoaded, setLogoLoaded] = useState(false)
  const canvasRef = useRef(null)
  const particlesRef = useRef([])

  const loadingTexts = [
    'Initializing Elegance EMS...',
    'Loading authentication modules...',
    'Connecting to database...',
    'Syncing employee records...',
    'Preparing dashboard...',
    'Almost ready...'
  ]

  useEffect(() => {
    const img = new Image()
    img.src = logoSrc
    img.onload = () => setLogoLoaded(true)

    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressTimer)
          return 100
        }
        const increment = Math.random() * 8 + 2
        return Math.min(prev + increment, 100)
      })
    }, 150)

    const textTimer = setInterval(() => {
      setTextIndex(prev => (prev + 1) % loadingTexts.length)
    }, 1200)

    const completeTimer = setTimeout(() => {
      setFadeOut(true)
      setTimeout(() => {
        if (onComplete) onComplete()
      }, 800)
    }, 3500)

    return () => {
      clearInterval(progressTimer)
      clearInterval(textTimer)
      clearTimeout(completeTimer)
    }
  }, [onComplete])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles = []
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2,
        color: Math.random() > 0.5 ? '#6366f1' : '#8b5cf6'
      })
    }

    let animationId
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.opacity
        ctx.fill()
        
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.opacity * 0.3
        ctx.fill()
      })
      
      ctx.globalAlpha = 1
      animationId = requestAnimationFrame(animate)
    }
    
    animate()
    particlesRef.current = particles

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <div className={`cinematic-loader ${fadeOut ? 'fade-out' : ''}`}>
      <canvas ref={canvasRef} className="loader-canvas" />
      
      <div className="loader-grid-overlay" />
      
      <div className="loader-content">
        <div className="loader-logo-container">
          <div className="loader-ring loader-ring-outer" />
          <div className="loader-ring loader-ring-inner" />
          <div className="loader-glow-bg" />
          <div className="loader-logo">
            {logoLoaded ? (
              <img 
                src={logoSrc} 
                alt="Elegance EMS" 
                className="logo-image"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            ) : (
              <svg viewBox="0 0 100 100" className="logo-svg">
                <defs>
                  <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="50%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <circle cx="50" cy="50" r="45" fill="none" stroke="url(#logoGradient)" strokeWidth="3" filter="url(#glow)" />
                <text x="50" y="58" textAnchor="middle" fill="url(#logoGradient)" fontSize="28" fontWeight="bold" fontFamily="system-ui">EG</text>
              </svg>
            )}
          </div>
          <div className="loader-ring loader-ring-rotate" />
        </div>

        <div className="loader-brand">
          <h1 className="loader-title">ELEGANCE</h1>
          <p className="loader-subtitle">Employee Management System</p>
        </div>

        <div className="loader-text-container">
          <span className="loader-text">{loadingTexts[textIndex]}</span>
        </div>

        <div className="loader-progress-container">
          <div className="loader-progress-bar">
            <div className="loader-progress-fill" style={{ width: `${progress}%` }} />
            <div className="loader-progress-glow" style={{ left: `${progress}%` }} />
          </div>
          <div className="loader-progress-text">{Math.round(progress)}%</div>
        </div>

        <div className="loader-footer">
          <div className="loader-status-indicator">
            <span className="status-dot" />
            <span>System Online</span>
          </div>
          <div className="loader-version">v2.0.0</div>
        </div>
      </div>

      <div className="loader-corner-accent top-left" />
      <div className="loader-corner-accent top-right" />
      <div className="loader-corner-accent bottom-left" />
      <div className="loader-corner-accent bottom-right" />

      <div className="loader-scan-line" />
    </div>
  )
}

export default Loader
