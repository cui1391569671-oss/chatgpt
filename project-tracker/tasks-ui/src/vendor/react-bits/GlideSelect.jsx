// React Bits GlideSelect JS-CSS; workbench accessibility/portal adapter. See registry snapshot.
'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Popover } from 'radix-ui';
import { moveSelectHighlight, revealSelectOption } from '../../components/workspace-select-motion.mjs';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, Tick02Icon } from '@hugeicons/core-free-icons';

import './GlideSelect.css';

const SIZES = {
  sm: { chip: 28, row: 26, font: 12 },
  md: { chip: 32, row: 30, font: 13 },
  lg: { chip: 44, row: 40, font: 14 }
};
const GAP = 1;
const DEFAULT_OPTIONS = ['One', 'Two', 'Three'];

const norm = o => (typeof o === 'string' ? { value: o, label: o } : o);
const textOf = it => (typeof it.label === 'string' ? it.label : it.value);
const typeaheadIndex = (items, from, ch) => {
  const c = ch.toLowerCase();
  const n = items.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (!items[i].disabled && textOf(items[i]).toLowerCase().startsWith(c)) return i;
  }
  return from;
};

export default function GlideSelect({
  options = DEFAULT_OPTIONS,
  value,
  defaultValue,
  onChange,
  placeholder = 'Select…',
  showTags = true,
  accentColor = '#f5f5f5',
  surfaceColor = '#27272a',
  highlightColor = '#3f3f46',
  textColor = '#f5f5f5',
  size = 'md',
  radius = 10,
  menuWidth = 176,
  placement = 'bottom',
  align = 'left',
  popDuration = 180,
  glideDuration = 220,
  rememberPosition = true,
  disabled = false,
  ariaLabel = 'Select',
  className = '',
  triggerProps = {},
  style = {},
  rowHeight,
  motionOff = false
}) {
  const items = options.map(norm);
  const [inner, setInner] = useState(defaultValue ?? '');
  const current = value ?? inner;
  const selected = items.findIndex(it => it.value === current);
  const [phase, setPhase] = useState('closed');
  const [active, setActive] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [menuNode, setMenuNode] = useState(null);
  const attachMenu = useCallback(node => { menuRef.current = node; setMenuNode(node); }, []);
  const pillRef = useRef(null);
  const instant = useRef(false);
  const revealActive = useRef(true);
  const closeTimer = useRef(undefined);
  const scrub = useRef(null);
  const id = useId();
  const S = SIZES[size] ?? SIZES.md;
  const step = (rowHeight ?? S.row) + GAP;
  const popOut = Math.round((popDuration * 2) / 3);
  const menuSize = menuWidth === 'trigger' ? 'var(--radix-popover-trigger-width)' : `${menuWidth}px`;

  useLayoutEffect(() => {
    if (phase !== 'open') return;
    const el = menuRef.current;
    const root = rootRef.current;
    if (!el || !root) return;
    const p = pillRef.current;
    if (p) {
      p.style.transition = 'none';
      p.style.transform = `translateY(${Math.max(0, selected) * step}px)`;
      p.style.opacity = '0';
      void p.offsetHeight;
      p.style.transition = '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, menuNode]);

  useLayoutEffect(() => {
    const p = pillRef.current;
    if (!p || phase !== 'open') return;
    moveSelectHighlight(p, active === null ? null : active * step, {instant:instant.current});
    instant.current = false;
  }, [active, phase, step, menuNode]);

  const open = viaKey => {
    if (disabled) return;
    clearTimeout(closeTimer.current);
    revealActive.current = true;
    instant.current = true;
    const first = items.findIndex(it => !it.disabled);
    setActive(selected >= 0 && !items[selected].disabled ? selected : viaKey && first >= 0 ? first : null);
    setPhase('open');
  };
  const close = mode => {
    setActive(null);
    scrub.current = null;
    clearTimeout(closeTimer.current);
    const el = menuRef.current;
    if (mode === 'instant' || motionOff || !el) {
      setPhase('closed');
      return;
    }
    el.style.transitionDuration = '';
    setPhase('closing');
    closeTimer.current = setTimeout(() => setPhase('closed'), popOut + 20);
  };
  const pick = (i, viaKey) => {
    const it = items[i];
    if (!it) {
      close('pop');
      return;
    }
    if (it.disabled) return;
    const changed = it.value !== current;
    close('pop');
    triggerRef.current?.focus({ preventScroll: true });
    if (changed) {
      if (value === undefined) setInner(it.value);
      if (!viaKey && rootRef.current) rootRef.current.dataset.swap = '';
      onChange?.(it.value, it);
    }
  };

  const onTriggerKey = e => {
    const k = e.key;
    const n = items.length;
    const cur = active ?? Math.max(0, selected);
    if (phase !== 'open') {
      if (k === 'Enter' || k === ' ' || k === 'ArrowDown' || k === 'ArrowUp') {
        e.preventDefault();
        open(true);
      }
      return;
    }
    const go = i => {
      e.preventDefault();
      revealActive.current = true;
      instant.current = true;
      const direction = k === 'Home' ? 1 : k === 'End' ? -1 : i < cur ? -1 : 1;
      let next = Math.min(n - 1, Math.max(0, i));
      while (next >= 0 && next < n && items[next].disabled) next += direction;
      if (next >= 0 && next < n) setActive(next);
    };
    if (k === 'ArrowDown' || k === 'ArrowUp') go(active === null ? cur : cur + (k === 'ArrowDown' ? 1 : -1));
    else if (k === 'Home' || k === 'End') go(k === 'Home' ? 0 : n - 1);
    else if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      pick(cur, true);
    } else if (k === 'Escape' || k === 'Tab') {
      if (k === 'Escape') e.preventDefault();
      e.stopPropagation();
      close('pop');
    } else if (k.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) go(typeaheadIndex(items, cur, k));
  };

  useEffect(() => {
    if (phase === 'closed') return undefined;
    const onDown = e => {
      if (rootRef.current && !rootRef.current.contains(e.target) && !menuRef.current?.contains(e.target)) close('pop');
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
  useEffect(() => {
    if (disabled && phase !== 'closed') close('instant');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  useEffect(() => {
    const closeExternal = e => { if (menuRef.current?.contains(e.target) || e.target === menuRef.current) close('pop'); };
    const closeAll = () => close('instant');
    document.addEventListener('workspace-select-close', closeExternal);
    document.addEventListener('workspace-select-close-all', closeAll);
    return () => { document.removeEventListener('workspace-select-close', closeExternal); document.removeEventListener('workspace-select-close-all', closeAll); };
  }, []);
  const scrollActiveIntoView = () => {
    if (phase === 'open' && active !== null && revealActive.current) revealSelectOption(menuRef.current,menuRef.current?.querySelector(`[data-index="${active}"]`));
  };
  useLayoutEffect(scrollActiveIntoView, [active, phase, menuNode]);

  const rowAt = (x, y) => {
    const menu = menuRef.current;
    if (!scrub.current || !menu) return null;
    const row = menu.ownerDocument.elementFromPoint(x, y)?.closest('[data-index]');
    if (!row || !menu.contains(row)) return null;
    const i = Number(row.dataset.index);
    return i >= 0 && i < items.length ? i : null;
  };
  const onListDown = e => {
    if (scrub.current || e.pointerType === 'touch') return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    scrub.current = { id: e.pointerId };
    revealActive.current = false;
    instant.current = true;
    setActive(rowAt(e.clientX, e.clientY));
  };
  const onListMove = e => {
    if (!scrub.current) { onListOver(e); return; }
    if (scrub.current.id !== e.pointerId) return;
    const i = rowAt(e.clientX, e.clientY);
    if (i !== active && (i === null || !items[i].disabled)) setActive(i);
  };
  const onListUp = e => {
    if (!scrub.current || scrub.current.id !== e.pointerId) return;
    const i = e.type === 'pointerup' ? rowAt(e.clientX, e.clientY) : null;
    scrub.current = null;
    if (i !== null) pick(i, false);
    else if (!rememberPosition) setActive(null);
  };
  const onListOver = e => {
    if (e.pointerType === 'touch' || scrub.current) return;
    const row = e.target.closest('[data-index]');
    if (!row) return;
    const i = Number(row.dataset.index);
    if (items[i]?.disabled) return;
    revealActive.current = false;
    if (i !== active && (i === null || !items[i].disabled)) setActive(i);
  };

  const origin = 'var(--radix-popover-content-transform-origin)';
  return (
    <Popover.Root open={phase !== 'closed'} onOpenChange={next => { if (!next) close('pop'); }}>
    <Popover.Anchor asChild><div
      ref={rootRef}
      className={`glide-select${className ? ` ${className}` : ''}`}
      data-size={size}
      data-motion-off={motionOff ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      style={{
        '--gs-accent': accentColor,
        '--gs-surface': surfaceColor,
        '--gs-highlight': highlightColor,
        '--gs-text': textColor,
        '--gs-radius': `${radius}px`,
        '--gs-inner-radius': `${Math.max(3, radius - 4)}px`,
        '--gs-chip': `${S.chip}px`,
        '--gs-row': `${rowHeight ?? S.row}px`,
        '--gs-font': `${S.font}px`,
        '--gs-menu-w': menuSize,
        '--gs-pop': `${popDuration}ms`,
        '--gs-pop-out': `${popOut}ms`,
        '--gs-glide': `${glideDuration}ms`,
        '--gs-origin': origin,
        ...style
      }}
      onAnimationEnd={e => {
        if (e.animationName === 'gs-swap' && rootRef.current) delete rootRef.current.dataset.swap;
      }}
    >
      <button
        {...triggerProps}
        ref={triggerRef}
        type="button"
        data-slot='select-trigger'
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={phase === 'open'}
        aria-controls={`${id}-list`}
        aria-activedescendant={active !== null ? `${id}-${active}` : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        className={`glide-select__trigger ${triggerProps.className || ''}`}
        onPointerDown={e => {
          if (e.button !== 0 || disabled) return;
          e.currentTarget.focus({ preventScroll: true });
        }}
        onClick={e => {
          if (disabled || e.button !== 0) return;
          e.currentTarget.focus({ preventScroll: true });
          if (phase === 'open') close('pop');
          else open(e.detail === 0);
        }}
        onKeyDown={onTriggerKey}
      >
        <span className="glide-select__label" key={current} data-empty={selected < 0 ? '' : undefined}>
          {selected >= 0 ? items[selected].label : placeholder}
        </span>
        <span className="glide-select__chevron" aria-hidden="true">
          <HugeiconsIcon icon={ArrowDown01Icon} size={12} strokeWidth={2.5} />
        </span>
      </button>
      </div></Popover.Anchor>
      {phase !== 'closed' ? (
        <Popover.Portal><Popover.Content asChild side={placement} align={align === 'left' ? 'start' : 'end'} sideOffset={6} collisionPadding={8} onPlaced={scrollActiveIntoView} onInteractOutside={e => { if (rootRef.current?.contains(e.target)) e.preventDefault(); }} onOpenAutoFocus={e => e.preventDefault()} onCloseAutoFocus={e => e.preventDefault()} onEscapeKeyDown={e => { e.preventDefault(); e.stopPropagation(); close('pop'); }}>
        <div ref={attachMenu} onWheel={e => { revealActive.current = false; e.stopPropagation(); }} onTouchMove={e => { revealActive.current = false; e.stopPropagation(); }} data-ui-portal='' data-slot='select-content' data-state={phase === 'open' ? 'open' : 'closed'} aria-hidden={phase === 'closing' || undefined} inert={phase === 'closing'} data-motion-off={motionOff ? '' : undefined} className="glide-select__menu" role='presentation' style={{'--gs-accent':accentColor,'--gs-surface':surfaceColor,'--gs-highlight':highlightColor,'--gs-text':textColor,'--gs-row':`${rowHeight ?? S.row}px`,'--gs-font':`${S.font}px`,'--gs-menu-w':menuSize,'--gs-radius':`${radius}px`,'--gs-inner-radius':`${Math.max(3,radius-4)}px`,'--gs-pop':`${popDuration}ms`,'--gs-pop-out':`${popOut}ms`,'--gs-glide':`${glideDuration}ms`,'--gs-origin':origin,...style,pointerEvents:phase === 'open' ? 'auto' : 'none'}}>
          <div
            id={`${id}-list`}
            role="listbox"
            aria-label={ariaLabel}
            className="glide-select__list"
            data-live={active !== null ? '' : undefined}
            onPointerLeave={() => {
              if (!scrub.current && !rememberPosition) setActive(null);
            }}
            onPointerDown={onListDown}
            onPointerMove={onListMove}
            onPointerUp={onListUp}
            onPointerCancel={onListUp}
            onLostPointerCapture={onListUp}
          >
            <span ref={pillRef} className="glide-select__pill" aria-hidden="true" />
            {items.map((it, i) => (
              <div
                key={it.value}
                id={`${id}-${i}`}
                role="option"
                aria-selected={i === selected}
                aria-disabled={it.disabled || undefined}
                onClick={e => { if (e.detail === 0 || e.nativeEvent.pointerType === 'touch') pick(i, false); }}
                data-index={i}
                className="glide-select__option"
              >
                <span className="glide-select__name">{it.label}</span>
                {showTags && it.tag ? <span className="glide-select__tag">{it.tag}</span> : null}
                <span className="glide-select__check" data-on={i === selected ? '' : undefined} aria-hidden="true">
                  <HugeiconsIcon icon={Tick02Icon} size={13} strokeWidth={2.5} />
                </span>
              </div>
            ))}
          </div>
        </div></Popover.Content></Popover.Portal>
      ) : null}
    </Popover.Root>
  );
}
