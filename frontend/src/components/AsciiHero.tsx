"use client";
import { useEffect, useState } from "react";

const MATH_LINES = [
  '                    ┌─────────────────────────────────┐',
  '                    │  AXIOM — Annotation Framework    │',
  '                    └─────────────────────────────────┘',
  '',
  '   Theorem 1.  (Convergence of Human Labels)',
  '',
  '   Let  A = {a₁, a₂, ..., aₙ}  be a set of annotators',
  '   and  X = {x₁, x₂, ..., xₘ}  a corpus of items.',
  '',
  '   Define the annotation function:',
  '',
  '         f : A × X  →  L',
  '',
  '   where L is a structured label space.',
  '',
  '          ┌                              ┐',
  '          │  f(a₁,x₁)  f(a₁,x₂)  ···   │',
  '     M =  │  f(a₂,x₁)  f(a₂,x₂)  ···   │',
  '          │     ⋮          ⋮        ⋱    │',
  '          │  f(aₙ,x₁)  f(aₙ,x₂)  ···   │',
  '          └                              ┘',
  '',
  '   Inter-annotator agreement:',
  '',
  '              1      n   n',
  '     κ  =  ─────   Σ   Σ   𝟙[f(aᵢ,xⱼ) = f(aₖ,xⱼ)]',
  '            n(n-1) i=1 k≠i',
  '',
  '   ─────────────────────────────────────────',
  '',
  '   Graph  G = (V, E)  where:',
  '',
  '      V = A ∪ X          (annotators + items)',
  '      E = {(a,x) : a assigned to x}',
  '',
  '              a₁ ──── x₁',
  '             ╱  ╲    ╱   ╲',
  '           a₂    ╲ ╱     x₃',
  '             ╲    ╳     ╱',
  '              ╲ ╱  ╲  ╱',
  '              a₃ ──── x₂',
  '',
  '   ─────────────────────────────────────────',
  '',
  '   Schema  S  =  (field_key, type, config)',
  '',
  '      S₁ = ("toxicity",  Likert[1..5],  {})',
  '      S₂ = ("hate",      Boolean,       {})',
  '      S₃ = ("category",  MultiSelect,   {opts})',
  '',
  '   ∀ xⱼ ∈ X,  annotation(xⱼ) ∈  ∏ Sₖ',
  '                                  k=1',
  '',
  '   Flagging criterion:',
  '',
  '      flag(xⱼ)  ⟺  Var[f(·,xⱼ)] > τ',
  '',
  '   where τ is the divergence threshold.  □',
];

export default function AsciiHero() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleLines(prev => {
        if (prev >= MATH_LINES.length) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 45);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col justify-center overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 20% 20%, rgba(0,30,50,0.9) 0%, #0a0b0e 60%)',
      }}>
      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.1) 2px, rgba(0,212,255,0.1) 4px)',
        }} />

      {/* ASCII content */}
      <pre className="px-6 xl:px-10 text-[10px] xl:text-[11px] 2xl:text-[12px] leading-[1.65] overflow-hidden select-none"
        style={{
          fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
          color: 'rgba(0,212,255,0.4)',
          textShadow: '0 0 8px rgba(0,212,255,0.1)',
        }}>
        {MATH_LINES.slice(0, visibleLines).map((line, i) => {
          // Title box — brighter
          const isTitle = i <= 2;
          // Section dividers
          const isDivider = line.includes('─────────────────');
          // Matrix brackets
          const isMatrix = line.includes('┌') || line.includes('┘') || line.includes('└') || line.includes('┐') || line.trimStart().startsWith('│');
          // Key formulas
          const isFormula = line.includes('κ') || line.includes('flag(') || line.includes('f :') || line.includes('∀');
          // Graph art
          const isGraph = line.includes('────') && line.includes('x') && line.includes('a');

          let color = 'rgba(0,212,255,0.35)';
          let shadow = '0 0 6px rgba(0,212,255,0.08)';

          if (isTitle) {
            color = 'rgba(0,212,255,0.7)';
            shadow = '0 0 12px rgba(0,212,255,0.2)';
          } else if (isFormula) {
            color = 'rgba(0,212,255,0.55)';
            shadow = '0 0 10px rgba(0,212,255,0.15)';
          } else if (isMatrix) {
            color = 'rgba(167,139,250,0.4)';
            shadow = '0 0 6px rgba(167,139,250,0.1)';
          } else if (isGraph) {
            color = 'rgba(52,211,153,0.4)';
            shadow = '0 0 6px rgba(52,211,153,0.1)';
          } else if (isDivider) {
            color = 'rgba(255,255,255,0.08)';
            shadow = 'none';
          }

          return (
            <div key={i} style={{ color, textShadow: shadow, minHeight: '1.65em' }}>
              {line || '\u00A0'}
            </div>
          );
        })}
        {/* Blinking cursor */}
        {visibleLines < MATH_LINES.length && (
          <span className="inline-block w-2 h-4 ml-1" style={{
            background: 'rgba(0,212,255,0.6)',
            animation: 'blink 1s step-end infinite',
          }} />
        )}
      </pre>

      {/* Bottom branding */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="font-serif italic text-[24px] tracking-tight" style={{ color: 'rgba(255,255,255,0.07)' }}>Axiom</p>
        <p className="text-[9px] uppercase tracking-[5px] mt-1" style={{ color: 'rgba(255,255,255,0.04)' }}>Annotation Framework</p>
      </div>

      <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
    </div>
  );
}
