// React Bits WakeSlider JS-CSS; exact upstream retained in WakeSlider.registry.json.
'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { cancelFrame, frame, useMotionValue, useMotionValueEvent, useReducedMotion, useSpring, useVelocity } from 'motion/react';

import './WakeSlider.css';

const SETTLE = 9.23;
const FULL_SPEED = 320;
const MIN_REACH = 1.5;
const FLAT = 0.002;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smoothstep = s => s * s * (3 - 2 * s);
const toPct = (v, min, max) => (max > min ? ((v - min) / (max - min)) * 100 : 0);
const snap = (v, min, max, step) => {
  if (!(max > min)) return min;
  if (!(step > 0)) return clamp(v, min, max);
  const lastWhole = min + Math.floor(+((max - min) / step).toFixed(6)) * step;
  const grid = clamp(Math.round((v - min) / step) * step + min, min, lastWhole);
  return +(lastWhole < max && Math.abs(v - max) <= Math.abs(v - grid) ? max : grid).toFixed(6);
};

export default function WakeSlider({
  value: valueProp,
  defaultValue = 50,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  bars = 32,
  height = 56,
  restHeight = 12,
  gap = 4,
  fillColor = '#f5f5f5',
  trackColor = '#27272a',
  crestColor = '',
  sensitivity = 1,
  reach = 6,
  skew = 0.6,
  glide = 0.3,
  smoothing = 100,
  showValue = false,
  formatValue,
  disabled = false,
  ariaLabel = 'Value',
  className = '',
  motionOff = false,
  handleProps = {}
}) {
  const [inner, setInner] = useState(defaultValue);
  const rawValue = valueProp ?? inner;
  const value = Number.isFinite(rawValue) ? clamp(rawValue, min, max) : min;
  const pct = toPct(value, min, max);
  const systemReduce = useReducedMotion();
  const reduce = systemReduce || motionOff || disabled;
  const format = formatValue ?? String;
  const rest = Math.min(restHeight, height - 1) / height;

  const rootRef = useRef(null);
  const trackRef = useRef(null);
  const handleRef = useRef(null);
  const barEls = useRef([]);
  const crestEls = useRef([]);
  const pointerId = useRef(null);
  const lastAmp = useRef(0);
  const latest = useRef(rawValue);
  latest.current = rawValue;

  const target = useMotionValue(pct);
  const w0 = SETTLE / glide;
  const head = useSpring(target, { stiffness: w0 * w0, damping: 2 * w0, mass: 1 });
  const rawSpeed = useVelocity(head);
  const wv = 2000 / smoothing;
  const speed = useSpring(rawSpeed, { stiffness: wv * wv, damping: 2.5 * wv, mass: 1 });

  useEffect(() => {
    target.set(pct);
    if (reduce) { head.jump(pct); speed.jump(0); paintRef.current(true); }
  }, [pct, reduce, target, head, speed]);

  const paint = (force = false) => {
    const h = ((reduce ? target.get() : head.get()) / 100) * (bars - 1);
    const v = reduce ? 0 : speed.get();
    const amp = smoothstep(clamp((Math.abs(v) * sensitivity) / FULL_SPEED, 0, 1));
    const dir = Math.sign(v) || 1;
    const r = MIN_REACH + (reach - MIN_REACH) * amp;
    const behind = r * (1 + skew);
    const ahead = r * (1 - 0.5 * skew);
    const lit = Math.round(h);
    const flat = !force && amp < FLAT && lastAmp.current < FLAT;
    for (let i = 0; i < bars; i++) {
      const el = barEls.current[i];
      if (!el) continue;
      const on = i <= lit ? 'true' : 'false';
      if (el.dataset.on !== on) el.dataset.on = on;
      if (flat) continue;
      const d = i - h;
      const R = d * dir < 0 ? behind : ahead;
      const lift = Math.abs(d) < R ? amp * Math.cos((Math.PI * d) / (2 * R)) ** 2 : 0;
      el.style.transform = `scaleY(${rest + lift * (1 - rest)})`;
      const crest = crestEls.current[i];
      if (crest) crest.style.opacity = String(lift);
    }
    lastAmp.current = amp;
  };
  const paintRef = useRef(paint);
  paintRef.current = paint;
  const run = useCallback(() => paintRef.current(), []);
  const schedule = useCallback(() => frame.render(run, false, true), [run]);
  useMotionValueEvent(head, 'change', schedule);
  useMotionValueEvent(speed, 'change', schedule);
  useLayoutEffect(() => {
    paintRef.current(true);
  });

  const commit = next => {
    const clean = wakeChangeValue(next, latest.current, min, max, step);
    if (clean === undefined) return;
    latest.current = clean;
    if (valueProp === undefined) setInner(clean);
    onChange?.(clean);
  };
  const commitFromX = x => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    if (!rect.width) return;
    let ratio = clamp((x - rect.left) / rect.width, 0, 1);
    if (getComputedStyle(track).direction === 'rtl') ratio = 1 - ratio;
    commit(min + ratio * (max - min));
  };
  const onPointerDown = e => {
    if (disabled || e.button !== 0 || pointerId.current !== null) return;
    pointerId.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    rootRef.current?.removeAttribute('data-instant');
    handleRef.current?.focus({ preventScroll: true });
    commitFromX(e.clientX);
  };
  const onPointerMove = e => {
    if (!disabled && e.pointerId === pointerId.current) commitFromX(e.clientX);
  };
  const endDrag = e => {
    if (e.pointerId !== pointerId.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    pointerId.current = null;
  };
  const cancelDrag = useCallback(() => {
    const id = pointerId.current;pointerId.current = null;
    if(id !== null)try{trackRef.current?.releasePointerCapture(id);}catch{}
  }, []);
  useEffect(() => { if(disabled)cancelDrag(); }, [disabled, cancelDrag]);
  useEffect(() => {
    const suspend = () => {cancelDrag();head.jump(target.get());speed.jump(0);cancelFrame(run);paintRef.current(true);};
    const visibility = () => {if(document.hidden)suspend();};
    window.addEventListener('blur', suspend);document.addEventListener('visibilitychange', visibility);
    return () => {window.removeEventListener('blur', suspend);document.removeEventListener('visibilitychange', visibility);cancelDrag();cancelFrame(run);head.stop();speed.stop();};
  }, [cancelDrag, run, head, speed, target]);
  const onKeyDown = e => {
    if (disabled) return;
    const next = wakeKeyValue(e.key, value, min, max, step, getComputedStyle(trackRef.current).direction === 'rtl');
    if (next === null) return;
    e.preventDefault();
    const clean = snap(next, min, max, step);
    const p = toPct(clean, min, max);
    rootRef.current?.setAttribute('data-instant', 'true');
    head.jump(p);
    speed.jump(0);
    target.jump(p);
    commit(clean);
  };

  const barNodes = useMemo(() => {
    barEls.current.length = bars;
    crestEls.current.length = bars;
    return Array.from({ length: bars }, (_, i) => (
      <span
        key={i}
        ref={el => {
          barEls.current[i] = el;
        }}
        className="wake-slider__bar"
      >
        {crestColor ? (
          <span
            ref={el => {
              crestEls.current[i] = el;
            }}
            className="wake-slider__crest"
          />
        ) : null}
      </span>
    ));
  }, [bars, crestColor]);

  return (
    <div
      ref={rootRef}
      className={`wake-slider${className ? ` ${className}` : ''}`}
      aria-disabled={disabled || undefined}
      data-motion-off={motionOff ? '' : undefined}
      style={{
        '--ws-fill': fillColor,
        '--ws-track': trackColor,
        '--ws-crest': crestColor || fillColor,
        '--ws-height': `${height}px`,
        '--ws-gap': `${gap}px`,
        '--ws-rest': rest
      }}
    >
      <div
        ref={trackRef}
        className="wake-slider__track"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      >
        {barNodes}
        <button
          {...handleProps}
          ref={handleRef}
          type="button"
          role="slider"
          className="wake-slider__handle"
          tabIndex={disabled ? -1 : 0}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={format(value)}
          aria-disabled={disabled || undefined}
          onKeyDown={onKeyDown}
        />
      </div>
      {showValue ? (
        <span className="wake-slider__value" aria-hidden="true">
          {format(value)}
        </span>
      ) : null}
    </div>
  );
}

export {snap as snapWakeValue};
export function wakeChangeValue(next, current, min, max, step) {
  const clean = snap(next, min, max, step);
  return clean === current ? undefined : clean;
}
export function wakeKeyValue(key,value,min,max,step,rtl=false){
 const horizontal=rtl?-step:step;
 const jumps={ArrowRight:value+horizontal,ArrowUp:value+step,ArrowLeft:value-horizontal,ArrowDown:value-step,PageUp:value+step*10,PageDown:value-step*10,Home:min,End:max};
 return Object.hasOwn(jumps,key)?jumps[key]:null;
}
