import { BellRing, Check, CircleHelp, Eye, Info, MonitorCog, ShieldCheck, UserRound, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { DensityControl } from '../components/DensityControl'
import { PageTransition } from '../components/PageTransition'
import { Surface, WorkspaceButton } from '../components/workspace-v2'
import { useDemo } from '../context'
import { getRoomByRole } from '../lib/demoLogic'
import '../styles/nurse-settings.css'

const SETTINGS_STORAGE_KEY = 'ultramed-nurse-settings'

type NurseSettings = {
  requestStatusNotifications: boolean
  clarificationNotifications: boolean
  draftReminders: boolean
  soundEnabled: boolean
  reducedMotion: boolean
  highContrast: boolean
}

const defaultSettings: NurseSettings = {
  requestStatusNotifications: true,
  clarificationNotifications: true,
  draftReminders: true,
  soundEnabled: false,
  reducedMotion: false,
  highContrast: false,
}

function readSettings(): NurseSettings {
  if (typeof window === 'undefined') return defaultSettings
  try {
    return { ...defaultSettings, ...JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}') }
  } catch {
    return defaultSettings
  }
}

function SettingSwitch({ checked, description, label, onChange }: {
  checked: boolean
  description: string
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="nurse-settings-row">
      <span className="min-w-0">
        <span className="nurse-settings-row__label">{label}</span>
        <span className="nurse-settings-row__description">{description}</span>
      </span>
      <input className="nurse-settings-switch__input" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="nurse-settings-switch" aria-hidden="true"><span /></span>
    </label>
  )
}

function SettingsSection({ children, description, icon, title }: {
  children: ReactNode
  description: string
  icon: ReactNode
  title: string
}) {
  return (
    <Surface level="panel" className="nurse-settings-section">
      <header className="nurse-settings-section__header">
        <span className="nurse-settings-section__icon">{icon}</span>
        <span className="min-w-0"><h2>{title}</h2><p>{description}</p></span>
      </header>
      <div className="nurse-settings-section__body">{children}</div>
    </Surface>
  )
}

export function NurseSettingsPage() {
  const { state: { role, rooms } } = useDemo()
  const room = getRoomByRole(rooms, role.startsWith('nurse-') ? role : 'nurse-105')
  const [settings, setSettings] = useState<NurseSettings>(readSettings)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    document.documentElement.dataset.nurseContrast = settings.highContrast ? 'high' : 'standard'
    document.documentElement.dataset.nurseMotion = settings.reducedMotion ? 'reduced' : 'standard'
    setSaved(true)
    const timer = window.setTimeout(() => setSaved(false), 1600)
    return () => window.clearTimeout(timer)
  }, [settings])

  function updateSetting<K extends keyof NurseSettings>(key: K, value: NurseSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  function playNotificationSound() {
    if (!settings.soundEnabled) return
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const context = new AudioContextClass()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(660, context.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.12)
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.2)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.22)
    oscillator.addEventListener('ended', () => void context.close())
  }

  return (
    <PageTransition respectReducedMotion className="nurse-page nurse-settings-page">
      <div className="nurse-settings-container">
        <header className="nurse-settings-page__header">
          <div>
            <p className="nurse-settings-eyebrow">Рабочее место</p>
            <h1>Настройки</h1>
            <p className="nurse-settings-lead">Настройте интерфейс и уведомления под свою работу. Параметры сохраняются только на этом устройстве.</p>
          </div>
          <div className="nurse-settings-save-state" role="status" aria-live="polite"><Check size={15} strokeWidth={2.4} />{saved ? 'Сохранено' : 'Все изменения сохранены'}</div>
        </header>

        <div className="nurse-settings-layout">
          <div className="nurse-settings-main">
            <SettingsSection title="Отображение" description="Размер и удобство рабочих элементов" icon={<MonitorCog size={21} />}>
              <div className="nurse-settings-density">
                <div><div className="nurse-settings-row__label">Плотность интерфейса</div><div className="nurse-settings-row__description">Меняет расстояния между строками и элементами управления</div></div>
                <DensityControl />
              </div>
            </SettingsSection>

            <SettingsSection title="Уведомления" description="Только события, которые требуют вашего внимания" icon={<BellRing size={21} />}>
              <SettingSwitch label="Изменение статуса заявки" description="Когда заявка принята, выдана частично или закрыта" checked={settings.requestStatusNotifications} onChange={(checked) => updateSetting('requestStatusNotifications', checked)} />
              <SettingSwitch label="Требуется уточнение" description="Если старшей медсестре нужен комментарий по позиции" checked={settings.clarificationNotifications} onChange={(checked) => updateSetting('clarificationNotifications', checked)} />
              <SettingSwitch label="Напоминание о черновике" description="Один раз в конце смены, если заявка не отправлена" checked={settings.draftReminders} onChange={(checked) => updateSetting('draftReminders', checked)} />
              <div className="nurse-settings-sound-row">
                <SettingSwitch label="Звук уведомлений" description="Короткий сигнал для важных событий" checked={settings.soundEnabled} onChange={(checked) => updateSetting('soundEnabled', checked)} />
                <WorkspaceButton variant="secondary" className="nurse-settings-sound-test" disabled={!settings.soundEnabled} onClick={playNotificationSound}>{settings.soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}Проверить звук</WorkspaceButton>
              </div>
            </SettingsSection>

            <SettingsSection title="Доступность" description="Сделайте интерфейс спокойнее и заметнее" icon={<Eye size={21} />}>
              <SettingSwitch label="Уменьшить движение" description="Отключает плавные переходы и анимацию интерфейса" checked={settings.reducedMotion} onChange={(checked) => updateSetting('reducedMotion', checked)} />
              <SettingSwitch label="Повышенная контрастность" description="Усиливает границы, текст и активные элементы" checked={settings.highContrast} onChange={(checked) => updateSetting('highContrast', checked)} />
            </SettingsSection>
          </div>

          <aside className="nurse-settings-aside" aria-label="Сведения о рабочем месте">
            <Surface level="panel" className="nurse-settings-profile">
              <div className="nurse-settings-profile__avatar"><UserRound size={25} strokeWidth={1.8} /></div>
              <div><div className="nurse-settings-profile__caption">Вы работаете как</div><div className="nurse-settings-profile__title">Кабинет {room?.number ?? '—'}</div><div className="nurse-settings-profile__subtitle">{room?.title ?? 'Стоматологический кабинет'}</div></div>
              <div className="nurse-settings-profile__meta"><ShieldCheck size={16} />Доступ младшей медсестры</div>
            </Surface>
            <Surface level="panel" className="nurse-settings-note">
              <span className="nurse-settings-note__icon"><Info size={18} /></span><div><h2>О настройках</h2><p>Они не меняют состав материалов, заявки или данные кабинета — только ваше отображение и способы оповещения.</p></div>
            </Surface>
            <Surface level="panel" className="nurse-settings-help">
              <CircleHelp size={20} /><div><h2>Нужна помощь?</h2><p>Обратитесь к старшей медсестре, если кабинет или уровень доступа указаны неверно.</p></div>
            </Surface>
          </aside>
        </div>
      </div>
    </PageTransition>
  )
}
