import {
  BriefcaseBusiness,
  Loader2,
  LockKeyhole,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState, type FormEvent, type PointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'
import { fieldStyles } from '../components/ui'
import { useDemo } from '../context'
import { cn } from '../lib/format'
import type { DemoRole } from '../types/demo'

type LoginStep = 'idle' | 'typing' | 'loading' | 'splash'

const loginProfiles: Record<
  DemoRole,
  {
    title: string
    caption: string
    login: string
    password: string
    route: string
    icon: typeof UserRound
  }
> = {
  'nurse-101': {
    title: 'Кабинет',
    caption: 'Работа с заявками кабинета 101',
    login: 'cabinet101@ultramed.local',
    password: 'demo-101',
    route: '/cabinet',
    icon: UserRound,
  },
  'nurse-102': {
    title: 'Кабинет',
    caption: 'Работа с заявками кабинета 102',
    login: 'cabinet102@ultramed.local',
    password: 'demo-102',
    route: '/cabinet',
    icon: UserRound,
  },
  'nurse-105': {
    title: 'Кабинет',
    caption: 'Работа с ортодонтическими заявками кабинета 105',
    login: 'cabinet105@ultramed.local',
    password: 'demo-105',
    route: '/cabinet',
    icon: UserRound,
  },
  'senior-nurse': {
    title: 'Старшая медсестра',
    caption: 'Склад, выдача, пополнение и приход',
    login: 'senior.nurse@ultramed.local',
    password: 'demo-senior',
    route: '/senior',
    icon: UsersRound,
  },
  manager: {
    title: 'Руководитель',
    caption: 'Аналитика, журнал и контроль снабжения',
    login: 'director@ultramed.local',
    password: 'demo-director',
    route: '/analytics',
    icon: BriefcaseBusiness,
  },
}

const roleOrder: DemoRole[] = ['nurse-105', 'senior-nurse', 'manager']

export function StartPage() {
  const navigate = useNavigate()
  const { startDemo } = useDemo()
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<DemoRole | null>(null)
  const [loginStep, setLoginStep] = useState<LoginStep>('idle')
  const [manualLogin, setManualLogin] = useState('')
  const [manualPassword, setManualPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const selectedProfile = selectedRole ? loginProfiles[selectedRole] : null

  const typedLogin = useMemo(
    () => (selectedProfile && loginStep !== 'idle' ? selectedProfile.login : manualLogin),
    [loginStep, manualLogin, selectedProfile],
  )
  const typedPassword = useMemo(
    () => (selectedProfile && loginStep !== 'idle' ? selectedProfile.password : manualPassword),
    [loginStep, manualPassword, selectedProfile],
  )

  useEffect(() => {
    if (!selectedRole || loginStep === 'idle' || !selectedProfile) return undefined

    if (loginStep === 'typing') {
      const timer = window.setTimeout(() => setLoginStep('loading'), 325)
      return () => window.clearTimeout(timer)
    }

    if (loginStep === 'loading') {
      const timer = window.setTimeout(() => {
        setModalOpen(false)
        setLoginStep('splash')
      }, 325)
      return () => window.clearTimeout(timer)
    }

    const navigateTimer = window.setTimeout(() => {
      startDemo(selectedRole)
      navigate(selectedProfile.route)
    }, 1250)

    return () => window.clearTimeout(navigateTimer)
  }, [loginStep, navigate, selectedProfile, selectedRole, startDemo])

  function openAuth() {
    setModalOpen(true)
    setSelectedRole(null)
    setLoginStep('idle')
    setManualLogin('')
    setManualPassword('')
    setAuthError('')
  }

  function selectRole(nextRole: DemoRole) {
    if (loginStep !== 'idle') return
    setSelectedRole(nextRole)
    setManualLogin('')
    setManualPassword('')
    setAuthError('')
    window.setTimeout(() => setLoginStep('typing'), 125)
  }

  function closeAuth() {
    if (loginStep !== 'idle') return
    setModalOpen(false)
    setSelectedRole(null)
    setAuthError('')
  }

  function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loginStep !== 'idle') return

    const match = roleOrder.find((role) => {
      const profile = loginProfiles[role]
      return profile.login === manualLogin.trim() && profile.password === manualPassword
    })

    if (!match) {
      setAuthError('Проверьте логин и пароль или выберите демо-пользователя.')
      return
    }

    selectRole(match)
  }

  function handleLandingPointerMove(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2

    event.currentTarget.style.setProperty('--landing-x', x.toFixed(3))
    event.currentTarget.style.setProperty('--landing-y', y.toFixed(3))
  }

  function handleLandingPointerLeave(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.style.setProperty('--landing-x', '0')
    event.currentTarget.style.setProperty('--landing-y', '0')
  }

  return (
    <>
      <style>{`
        @keyframes landing-gradient-flow {
          0%, 100% { background-position: 46% 48%; }
          35% { background-position: 52% 42%; }
          70% { background-position: 56% 58%; }
        }

        @keyframes landing-ambient-breathe {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.82; }
          50% { transform: translate3d(2.2%, -1.4%, 0) scale(1.055); opacity: 1; }
        }

        @keyframes landing-sheen {
          0%, 100% { transform: translateX(-26%) skewX(-10deg); opacity: 0.18; }
          50% { transform: translateX(26%) skewX(-10deg); opacity: 0.46; }
        }

        @keyframes landing-border-light {
          0%, 100% { transform: translateX(-34%); opacity: 0; }
          35%, 65% { opacity: 0.78; }
          50% { transform: translateX(34%); opacity: 0.92; }
        }

        @keyframes landing-button-sheen {
          0%, 100% { background-position: 180% 0; opacity: 0.22; }
          50% { background-position: -80% 0; opacity: 0.44; }
        }

        @keyframes landing-button-border {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes landing-soft-wave {
          0%, 100% { transform: translate3d(-4%, 0, 0) scaleX(1); opacity: 0.40; }
          50% { transform: translate3d(4%, -1.8%, 0) scaleX(1.12); opacity: 0.68; }
        }

        @keyframes landing-soft-wave-alt {
          0%, 100% { transform: translate3d(4%, 0, 0) scaleX(1.04); opacity: 0.30; }
          50% { transform: translate3d(-4.4%, 1.8%, 0) scaleX(1); opacity: 0.58; }
        }

        @keyframes landing-ribbon-pass {
          0%, 100% { transform: translate3d(-18%, 14%, 0) rotate(-18deg); opacity: 0.12; }
          42% { opacity: 0.34; }
          58% { opacity: 0.42; }
          100% { transform: translate3d(18%, -12%, 0) rotate(-18deg); opacity: 0.12; }
        }

        @keyframes landing-ribbon-pass-alt {
          0%, 100% { transform: translate3d(16%, -12%, 0) rotate(16deg); opacity: 0.10; }
          50% { transform: translate3d(-16%, 12%, 0) rotate(16deg); opacity: 0.36; }
        }

        @keyframes landing-card-glow {
          0%, 100% {
            border-color: rgba(255,255,255,0.78);
            box-shadow: inset 0 0 0 1px rgba(255,255,255,0.52), 0 0 0 rgba(121,226,166,0);
          }
          50% {
            border-color: rgba(171,232,206,0.92);
            box-shadow: inset 0 0 0 1px rgba(255,255,255,0.72), 0 0 34px rgba(121,226,166,0.22);
          }
        }

        @keyframes landing-card-scan {
          0%, 100% { transform: translateX(-130%) skewX(-14deg); opacity: 0; }
          38% { opacity: 0.22; }
          54% { transform: translateX(130%) skewX(-14deg); opacity: 0.30; }
          70% { opacity: 0; }
        }

        @keyframes landing-modal-border {
          0% { transform: rotate(0deg); opacity: 0.58; }
          50% { opacity: 0.92; }
          100% { transform: rotate(360deg); opacity: 0.58; }
        }

        @keyframes landing-loading-ring {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 900px), (pointer: coarse) {
          .landing-shell,
          .landing-shell [class*="animation:landing-"] {
            animation: none !important;
          }

          .landing-shell .pointer-events-none.absolute[class*="blur-"] {
            display: none !important;
          }

          .landing-shell [class*="backdrop-blur"] {
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
          }

          .landing-auth-overlay,
          .landing-splash {
            backface-visibility: hidden;
            contain: layout paint;
            transform: translateZ(0);
          }
        }
      `}</style>
      <div
        className="landing-shell relative min-h-screen overflow-hidden bg-[#eaf6f1] text-[#17362d] [background:radial-gradient(circle_at_50%_44%,#ffffff_0%,#ffffff_30%,#eef9f4_48%,#cfe8df_72%,#174b41_100%)] [background-size:150%_150%] [animation:landing-gradient-flow_28s_ease-in-out_infinite]"
        onPointerMove={handleLandingPointerMove}
        onPointerLeave={handleLandingPointerLeave}
      >
        <div className="pointer-events-none absolute inset-[-8%] opacity-85 [background-image:radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.94)_0%,transparent_31%),radial-gradient(circle_at_79%_74%,rgba(180,236,212,0.24)_0%,transparent_34%),radial-gradient(circle_at_48%_48%,rgba(121,226,166,0.26)_0%,transparent_43%)] [animation:landing-ambient-breathe_24s_ease-in-out_infinite]" />
        <div
          className="pointer-events-none absolute left-[6%] top-[7%] h-[34%] w-[42%] rounded-[48px] bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.62)_0%,rgba(210,246,230,0.30)_42%,transparent_72%)] blur-3xl transition-transform duration-300"
          style={{ transform: 'translate3d(calc(var(--landing-x, 0) * 16px), calc(var(--landing-y, 0) * 10px), 0)' }}
        />
        <div
          className="pointer-events-none absolute bottom-[4%] right-[4%] h-[38%] w-[46%] rounded-[48px] bg-[radial-gradient(circle_at_50%_50%,rgba(213,248,233,0.42)_0%,rgba(255,255,255,0.30)_48%,transparent_74%)] blur-3xl transition-transform duration-300"
          style={{ transform: 'translate3d(calc(var(--landing-x, 0) * -18px), calc(var(--landing-y, 0) * -12px), 0)' }}
        />
        <div className="pointer-events-none absolute left-[-12%] top-[18%] h-[32%] w-[124%] rotate-[-7deg] bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.42)_28%,rgba(214,247,232,0.42)_50%,rgba(255,255,255,0.28)_70%,transparent_100%)] blur-3xl [animation:landing-soft-wave_26s_ease-in-out_infinite]" />
        <div className="pointer-events-none absolute bottom-[12%] left-[-10%] h-[26%] w-[122%] rotate-[6deg] bg-[linear-gradient(90deg,transparent_0%,rgba(185,231,213,0.34)_24%,rgba(255,255,255,0.40)_52%,rgba(210,244,230,0.28)_76%,transparent_100%)] blur-3xl [animation:landing-soft-wave-alt_31s_ease-in-out_infinite]" />
        <div className="pointer-events-none absolute left-[-20%] top-[-18%] h-[86%] w-[138%] bg-[linear-gradient(100deg,transparent_0%,rgba(255,255,255,0.34)_38%,rgba(179,237,211,0.26)_49%,rgba(255,255,255,0.30)_60%,transparent_100%)] blur-2xl [animation:landing-ribbon-pass_18s_ease-in-out_infinite]" />
        <div className="pointer-events-none absolute bottom-[-24%] right-[-22%] h-[82%] w-[132%] bg-[linear-gradient(82deg,transparent_0%,rgba(217,248,234,0.30)_34%,rgba(255,255,255,0.38)_50%,rgba(191,235,216,0.26)_66%,transparent_100%)] blur-2xl [animation:landing-ribbon-pass-alt_22s_ease-in-out_infinite]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,transparent_0%,transparent_60%,rgba(5,47,43,0.18)_100%)]" />
        <PageTransition className="relative mx-auto flex min-h-screen w-full flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(255,255,255,0.72)_0%,rgba(255,255,255,0.34)_34%,rgba(238,249,244,0.18)_54%,transparent_76%)] [background-size:130%_130%] [animation:landing-gradient-flow_32s_ease-in-out_infinite]" />
        <div className="pointer-events-none absolute inset-y-[-20%] left-1/2 w-[34%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.46),transparent)] blur-2xl [animation:landing-sheen_18s_ease-in-out_infinite]" />

        <main className="relative z-10 flex w-full flex-col items-center justify-center px-4">
          <motion.div
            className="relative w-full max-w-3xl overflow-hidden rounded-[34px] border border-white/85 bg-white/92 px-6 py-8 shadow-[0_30px_90px_rgba(3,65,49,0.24)] ring-1 ring-[#dcefe7] backdrop-blur-xl [animation:landing-card-glow_7.5s_ease-in-out_infinite] md:px-12 md:py-11"
            initial={{ opacity: 0, y: 14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.42, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="pointer-events-none absolute inset-0 rounded-[34px] border border-white/60" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,#79e2a6,transparent)]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(229,255,241,0.72)_0%,rgba(255,255,255,0)_48%)]" />
            <div className="pointer-events-none absolute inset-y-[-12%] left-[-22%] w-[38%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.56),rgba(186,241,215,0.30),transparent)] blur-xl [animation:landing-card-scan_11s_ease-in-out_infinite]" />
            <img
              src="/brand/ultramed-main-logo.svg"
              alt="УльтраМед"
              className="relative mx-auto h-auto w-full max-w-[640px]"
            />
            <div className="relative mx-auto mt-2 max-w-[420px] text-center text-3xl font-normal leading-none text-[#6089bb] md:text-4xl">
              СНАБЖЕНИЕ
            </div>
          </motion.div>
          <motion.button
            type="button"
            onClick={openAuth}
            className="group relative mt-8 inline-flex min-h-[64px] min-w-[220px] items-center justify-center overflow-hidden rounded-full bg-white/90 p-px text-[#155743] shadow-[0_12px_30px_rgba(23,91,72,0.12),0_1px_4px_rgba(23,91,72,0.06)] transition duration-300 hover:-translate-y-0.5 hover:text-[#0d4938] hover:shadow-[0_16px_36px_rgba(23,91,72,0.16),0_2px_8px_rgba(23,91,72,0.08)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a9e4cc]/45"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.34, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
            whileTap={{ scale: 0.985 }}
          >
            <span className="pointer-events-none absolute inset-[-90%] bg-[conic-gradient(from_90deg,transparent_0deg,rgba(255,255,255,0.92)_56deg,rgba(129,226,176,0.84)_116deg,rgba(255,255,255,0.96)_164deg,transparent_218deg,rgba(47,154,111,0.40)_292deg,transparent_360deg)] [animation:landing-button-border_8s_linear_infinite]" />
            <span className="absolute inset-px rounded-full border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(238,252,245,0.98)_46%,rgba(217,244,231,0.98)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.98),inset_0_-1px_0_rgba(42,111,89,0.08)] transition duration-300 group-hover:bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(230,252,241,1)_45%,rgba(201,237,220,0.98)_100%)]" />
            <span className="pointer-events-none absolute inset-px rounded-full bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.88)_40%,transparent_58%)] bg-[length:230%_100%] [animation:landing-button-sheen_5.6s_ease-in-out_infinite]" />
            <span className="pointer-events-none absolute inset-x-6 top-px h-px rounded-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.95),transparent)]" />
            <span
              className="relative -translate-y-px font-extrabold leading-none tracking-normal [font-family:Manrope,var(--font-sans)]"
              style={{ fontSize: '28px' }}
            >
              Вход
            </span>
          </motion.button>
        </main>
      </PageTransition>

      <AnimatePresence>
        {modalOpen ? (
          <motion.div
            className="landing-auth-overlay fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#eaf6f1] px-4 py-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="pointer-events-none absolute inset-[-8%] [background:radial-gradient(circle_at_48%_38%,rgba(255,255,255,0.96)_0%,rgba(235,250,243,0.82)_38%,rgba(181,224,207,0.46)_72%,rgba(15,70,56,0.28)_100%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_0%,transparent_62%,rgba(5,47,43,0.18)_100%)]" />
            <motion.section
              className="relative w-full max-w-[620px] overflow-hidden rounded-[30px] bg-white/72 p-px shadow-[0_34px_88px_rgba(16,75,58,0.22),0_2px_10px_rgba(16,75,58,0.08)]"
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="pointer-events-none absolute inset-[-72%] bg-[conic-gradient(from_90deg,transparent_0deg,rgba(255,255,255,0.78)_55deg,rgba(129,226,176,0.48)_115deg,rgba(255,255,255,0.88)_165deg,transparent_220deg,rgba(47,154,111,0.24)_292deg,transparent_360deg)]" />
              <div className="relative overflow-hidden rounded-[29px] border border-white/72 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(243,252,248,0.90)_52%,rgba(226,246,237,0.88)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] md:p-5">
                <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(121,226,166,0.62),rgba(255,255,255,0.95),transparent)]" />
                <div className="relative grid grid-cols-[40px_minmax(0,1fr)_40px] items-start gap-3">
                  <div />
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-[#17362d] [font-family:Manrope,var(--font-sans)]">Вход в систему</h2>
                    <p className="mx-auto mt-1 max-w-sm text-sm leading-5 text-[#587367]">
                      Введите учетные данные или используйте демо-вход.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeAuth}
                    className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/75 bg-white/72 text-[#587367] shadow-[0_8px_22px_rgba(23,91,72,0.10),inset_0_1px_0_rgba(255,255,255,0.86)] transition hover:-translate-y-0.5 hover:bg-white hover:text-[#17362d]"
                    aria-label="Закрыть авторизацию"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="relative mt-5 grid gap-2 md:grid-cols-3">
                  {roleOrder.map((item, index) => {
                    const profile = loginProfiles[item]
                    const Icon = profile.icon
                    const active = selectedRole === item

                    return (
                      <motion.button
                        key={item}
                        type="button"
                        onClick={() => selectRole(item)}
                        disabled={loginStep !== 'idle'}
                        className={cn(
                          'group relative min-h-[74px] overflow-hidden rounded-[18px] border px-3 py-2.5 text-left shadow-[0_10px_22px_rgba(23,91,72,0.07)] transition disabled:pointer-events-none',
                          active
                            ? 'border-[#93d6b9] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(227,248,238,0.96)_100%)] text-[#17362d] shadow-[0_18px_34px_rgba(23,91,72,0.14),inset_0_1px_0_rgba(255,255,255,0.9)]'
                            : 'border-white/80 bg-white/66 text-[#52665f] hover:-translate-y-0.5 hover:border-[#ace1c9] hover:bg-white/90 hover:shadow-[0_18px_34px_rgba(23,91,72,0.12)]',
                        )}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22, delay: 0.07 + index * 0.04, ease: 'easeOut' }}
                      >
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.88)_0%,transparent_52%)] opacity-70" />
                        <div className="relative flex items-center gap-2.5">
                          <div
                            className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border transition',
                              active
                                ? 'border-white/90 bg-white text-[#267e63] shadow-[0_8px_18px_rgba(23,91,72,0.10)]'
                                : 'border-white/80 bg-[#f4fbf8]/90 text-[#6089bb] group-hover:bg-white group-hover:text-[#267e63]',
                            )}
                          >
                            <Icon size={20} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold leading-[15px] text-[#17362d] [font-family:Manrope,var(--font-sans)]">
                              {item === 'senior-nurse' ? (
                                <>
                                  Старшая
                                  <br />
                                  медсестра
                                </>
                              ) : (
                                profile.title
                              )}
                            </div>
                            <div className="truncate text-[11px] leading-4 text-[#6b8178]">Демо-вход</div>
                          </div>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>

                <motion.form
                  className="relative mt-4 overflow-hidden rounded-[24px] border border-white/78 bg-white/74 p-4 shadow-[0_14px_34px_rgba(23,91,72,0.10),inset_0_1px_0_rgba(255,255,255,0.84)]"
                  onSubmit={handleManualSubmit}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.26, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(121,226,166,0.52),transparent)]" />

                  <div className="relative grid gap-3">
                    <label className="grid gap-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-[#7e9289]">Логин</span>
                      <div className="relative">
                        <UserRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7e9289]" size={17} />
                        <input
                          className={cn(fieldStyles, 'h-11 border-white/80 bg-white/78 pl-10 text-[15px] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]')}
                          value={typedLogin}
                          placeholder="Введите логин"
                          onChange={(event) => {
                            setManualLogin(event.target.value)
                            setSelectedRole(null)
                            setAuthError('')
                          }}
                          readOnly={loginStep !== 'idle'}
                          autoComplete="username"
                        />
                      </div>
                    </label>

                    <label className="grid gap-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-[#7e9289]">Пароль</span>
                      <div className="relative">
                        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7e9289]" size={17} />
                        <input
                          type="password"
                          className={cn(fieldStyles, 'h-11 border-white/80 bg-white/78 pl-10 text-[15px] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]')}
                          value={typedPassword}
                          placeholder="Введите пароль"
                          onChange={(event) => {
                            setManualPassword(event.target.value)
                            setSelectedRole(null)
                            setAuthError('')
                          }}
                          readOnly={loginStep !== 'idle'}
                          autoComplete="current-password"
                        />
                      </div>
                    </label>
                  </div>

                  <div className="relative mt-4 min-h-[52px] rounded-2xl border border-white/72 bg-[#f8fbf9]/78 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
                    {loginStep === 'idle' ? (
                      <div className="grid gap-3">
                        {authError ? <div className="text-center text-sm text-rose-700">{authError}</div> : null}
                        <label className="mx-auto inline-flex cursor-pointer select-none items-center gap-2 text-sm font-medium text-[#587367]">
                          <span className="relative grid size-5 place-items-center rounded-md border border-[#b9decf] bg-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                            <input
                              type="checkbox"
                              checked={rememberMe}
                              onChange={(event) => setRememberMe(event.target.checked)}
                              className="peer absolute inset-0 cursor-pointer opacity-0"
                            />
                            <span className="size-2.5 rounded-sm bg-[#267e63] opacity-0 transition peer-checked:opacity-100" />
                          </span>
                          Запомнить меня
                        </label>
                        <button
                          type="submit"
                          className="mx-auto inline-flex min-h-10 min-w-32 shrink-0 items-center justify-center rounded-full border border-[#b9decf] bg-white/82 px-7 text-base font-bold text-[#155743] shadow-[0_8px_18px_rgba(23,91,72,0.08),inset_0_1px_0_rgba(255,255,255,0.88)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_24px_rgba(23,91,72,0.12)] [font-family:Manrope,var(--font-sans)]"
                        >
                          Войти
                        </button>
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-[#17362d] [font-family:Manrope,var(--font-sans)]">
                          <Loader2 size={17} className="animate-spin text-[#267e63]" />
                          {loginStep === 'typing' ? 'Вводим логин и пароль' : 'Открываем рабочий экран'}
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#e6f2ed] shadow-[inset_0_1px_2px_rgba(23,91,72,0.08)]">
                          <motion.div
                            className="h-full rounded-full bg-[linear-gradient(90deg,#6edb9f_0%,#267e63_58%,#b9efcf_100%)] shadow-[0_0_18px_rgba(110,219,159,0.42)]"
                            initial={{ width: '18%' }}
                            animate={{ width: loginStep === 'typing' ? '58%' : loginStep === 'loading' ? '86%' : '100%' }}
                            transition={{ duration: 0.275 }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.form>
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {loginStep === 'splash' ? (
          <motion.div
            className="landing-splash fixed inset-0 z-[60] grid place-items-center overflow-hidden bg-[#eaf6f1] px-8 [background:radial-gradient(circle_at_50%_42%,#ffffff_0%,#eef9f4_36%,#cfe8df_70%,#174b41_100%)] [background-size:150%_150%] [animation:landing-gradient-flow_18s_ease-in-out_infinite]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="pointer-events-none absolute inset-[-8%] opacity-90 [background-image:radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.94)_0%,transparent_31%),radial-gradient(circle_at_79%_74%,rgba(180,236,212,0.25)_0%,transparent_34%),radial-gradient(circle_at_50%_50%,rgba(121,226,166,0.24)_0%,transparent_46%)] [animation:landing-ambient-breathe_16s_ease-in-out_infinite]" />
            <div className="pointer-events-none absolute left-[-18%] top-[16%] h-[34%] w-[136%] rotate-[-7deg] bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.46)_30%,rgba(205,245,228,0.42)_50%,rgba(255,255,255,0.28)_70%,transparent_100%)] blur-3xl [animation:landing-soft-wave_18s_ease-in-out_infinite]" />
            <div className="pointer-events-none absolute bottom-[8%] left-[-14%] h-[28%] w-[130%] rotate-[6deg] bg-[linear-gradient(90deg,transparent_0%,rgba(188,232,214,0.34)_24%,rgba(255,255,255,0.42)_52%,rgba(214,246,232,0.26)_76%,transparent_100%)] blur-3xl [animation:landing-soft-wave-alt_22s_ease-in-out_infinite]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_0%,transparent_62%,rgba(5,47,43,0.16)_100%)]" />
            <motion.div
              className="relative grid w-full max-w-xl place-items-center overflow-hidden rounded-[30px] border border-white/78 bg-white/86 px-8 py-9 shadow-[0_30px_86px_rgba(16,75,58,0.22),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-2xl [animation:landing-card-glow_6.5s_ease-in-out_infinite]"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.99 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.92)_0%,transparent_54%)]" />
              <div className="pointer-events-none absolute inset-y-[-20%] left-[-24%] w-[42%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.58),rgba(197,245,222,0.28),transparent)] blur-xl [animation:landing-card-scan_7s_ease-in-out_infinite]" />
              <img src="/brand/ultramed-main-logo.svg" alt="УльтраМед" className="relative h-auto w-full max-w-[430px]" />
              <div className="relative mt-2 text-center text-2xl font-normal leading-none text-[#6089bb]">СНАБЖЕНИЕ</div>
              <div className="relative mt-6 h-2 w-full max-w-[280px] overflow-hidden rounded-full bg-[#dcefe7] shadow-[inset_0_1px_2px_rgba(23,91,72,0.08)]">
                <motion.div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#6edb9f_0%,#267e63_58%,#b9efcf_100%)] shadow-[0_0_18px_rgba(110,219,159,0.42)]"
                  initial={{ width: '18%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.175, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      </div>
    </>
  )
}
