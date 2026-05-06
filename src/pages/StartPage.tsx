import {
  BriefcaseBusiness,
  KeyRound,
  Loader2,
  LockKeyhole,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'
import { fieldStyles } from '../components/ui'
import { useDemo } from '../context'
import { roleLabels } from '../lib/demoLogic'
import { cn } from '../lib/format'
import type { DemoRole } from '../types/demo'

type LoginStep = 'idle' | 'typing' | 'loading'

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
  const selectedProfile = selectedRole ? loginProfiles[selectedRole] : null

  const typedLogin = useMemo(
    () => (selectedProfile && loginStep !== 'idle' ? selectedProfile.login : ''),
    [loginStep, selectedProfile],
  )
  const typedPassword = useMemo(
    () => (selectedProfile && loginStep !== 'idle' ? '•'.repeat(selectedProfile.password.length) : ''),
    [loginStep, selectedProfile],
  )

  useEffect(() => {
    if (!selectedRole || loginStep === 'idle' || !selectedProfile) return undefined

    const loadingTimer = window.setTimeout(() => setLoginStep('loading'), 750)
    const navigateTimer = window.setTimeout(() => {
      startDemo(selectedRole)
      navigate(selectedProfile.route)
    }, 1650)

    return () => {
      window.clearTimeout(loadingTimer)
      window.clearTimeout(navigateTimer)
    }
  }, [loginStep, navigate, selectedProfile, selectedRole, startDemo])

  function openAuth() {
    setModalOpen(true)
    setSelectedRole(null)
    setLoginStep('idle')
  }

  function selectRole(nextRole: DemoRole) {
    if (loginStep !== 'idle') return
    setSelectedRole(nextRole)
    window.setTimeout(() => setLoginStep('typing'), 250)
  }

  function closeAuth() {
    if (loginStep !== 'idle') return
    setModalOpen(false)
    setSelectedRole(null)
  }

  return (
    <>
      <style>{`
        @keyframes landing-gradient-flow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes landing-sheen {
          0% { transform: translateX(-42%) skewX(-16deg); opacity: 0.34; }
          50% { opacity: 0.68; }
          100% { transform: translateX(42%) skewX(-16deg); opacity: 0.34; }
        }
      `}</style>
      <div className="relative min-h-screen overflow-hidden bg-[#063f36] px-4 py-5 text-[#17362d] [background:linear-gradient(125deg,#052f2b_0%,#0a5749_30%,#11906b_58%,#68d99a_100%)] [background-size:180%_180%] [animation:landing-gradient-flow_16s_ease-in-out_infinite]">
        <div className="pointer-events-none absolute inset-0 opacity-55 [background-image:linear-gradient(115deg,transparent_0%,rgba(211,255,230,0.18)_30%,transparent_54%,rgba(88,225,151,0.16)_74%,transparent_100%)] [background-size:220%_220%] [animation:landing-gradient-flow_12s_ease-in-out_infinite]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.10)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px] opacity-45" />
        <PageTransition className="relative mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-7xl flex-col items-center justify-center overflow-hidden rounded-[34px] border border-white/25 bg-white/95 shadow-[0_42px_120px_rgba(1,43,34,0.38)] backdrop-blur">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#073f37_0%,#0d7d60_30%,#32b77e_47%,#f0fbf5_47%,#ffffff_100%)] [background-size:170%_170%] [animation:landing-gradient-flow_18s_ease-in-out_infinite]" />
        <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(90deg,rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="absolute left-[-12%] top-[10%] h-[74%] w-[50%] rotate-[-8deg] rounded-[52px] border border-white/10 bg-white/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]" />
        <div className="absolute bottom-[-18%] right-[-10%] h-[48%] w-[54%] rotate-[-10deg] rounded-[52px] bg-[linear-gradient(135deg,#e5fff1_0%,#ffffff_72%)] shadow-[0_24px_80px_rgba(11,100,75,0.12)]" />
        <div className="pointer-events-none absolute inset-y-[-20%] left-1/2 w-[38%] bg-[linear-gradient(90deg,transparent,rgba(219,255,232,0.22),transparent)] blur-xl [animation:landing-sheen_11s_ease-in-out_infinite]" />

        <main className="relative z-10 flex w-full flex-col items-center justify-center px-4">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-[34px] border border-white/85 bg-white/92 px-6 py-8 shadow-[0_30px_90px_rgba(3,65,49,0.24)] ring-1 ring-[#dcefe7] backdrop-blur-xl md:px-12 md:py-11">
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,#79e2a6,transparent)]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(229,255,241,0.72)_0%,rgba(255,255,255,0)_48%)]" />
            <img
              src="/brand/ultramed-main-logo.svg"
              alt="УльтраМед"
              className="relative mx-auto h-auto w-full max-w-[640px]"
            />
            <div className="relative mx-auto mt-2 max-w-[420px] text-center text-3xl font-normal leading-none text-[#6089bb] md:text-4xl">
              СНАБЖЕНИЕ
            </div>
          </div>
          <button
            type="button"
            onClick={openAuth}
            className="group relative mt-8 inline-flex min-h-14 min-w-60 items-center justify-center gap-2 overflow-hidden rounded-full border border-white/25 bg-[linear-gradient(110deg,#0c6b55_0%,#20a574_42%,#77df9d_100%)] bg-[length:180%_180%] px-7 text-base font-semibold text-white shadow-[0_20px_44px_rgba(3,72,52,0.34)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_54px_rgba(3,72,52,0.42)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70 [animation:landing-gradient-flow_10s_ease-in-out_infinite]"
          >
            Авторизация
            <KeyRound size={17} className="relative" />
          </button>
        </main>
      </PageTransition>

      <AnimatePresence>
        {modalOpen ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#10251d]/42 px-4 py-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.section
              className="w-full max-w-xl rounded-[28px] border border-[#d9ebe4] bg-[linear-gradient(180deg,#ffffff_0%,#f5fbf8_100%)] p-4 shadow-[0_32px_70px_rgba(16,37,29,0.26)] md:p-5"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.18 }}
            >
              <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-start gap-3">
                <div />
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-[#17362d]">Выберите пользователя</h2>
                  <p className="mx-auto mt-1 max-w-sm text-sm leading-5 text-[#587367]">
                    Доступ к разделам системы зависит от выбранной роли.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeAuth}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d8e6df] bg-white text-[#587367] transition hover:bg-[#f4fbf8] hover:text-[#17362d]"
                  aria-label="Закрыть авторизацию"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 grid gap-2 md:grid-cols-3">
                {roleOrder.map((item) => {
                  const profile = loginProfiles[item]
                  const Icon = profile.icon
                  const active = selectedRole === item

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => selectRole(item)}
                      disabled={loginStep !== 'idle'}
                      className={cn(
                        'group min-h-32 rounded-[22px] border p-3 text-left transition disabled:pointer-events-none',
                        active
                          ? 'border-[#70a893] bg-[#eef7f3] text-[#17362d] shadow-[0_14px_26px_rgba(21,58,46,0.10)]'
                          : 'border-[#dce9e3] bg-white text-[#52665f] hover:-translate-y-0.5 hover:border-[#9cc7b6] hover:shadow-[0_18px_28px_rgba(21,58,46,0.10)]',
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-xl transition',
                          active ? 'bg-white text-[#267e63]' : 'bg-[#f4fbf8] text-[#6089bb] group-hover:bg-[#eef7f3] group-hover:text-[#267e63]',
                        )}
                      >
                        <Icon size={20} />
                      </div>
                      <div className="mt-3 text-base font-semibold leading-5 text-[#17362d]">{profile.title}</div>
                    </button>
                  )
                })}
              </div>

              <AnimatePresence>
                {selectedProfile ? (
                  <motion.div
                    className="mt-4 overflow-hidden rounded-[22px] border border-[#dce9e3] bg-white p-4"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22 }}
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide text-[#7e9289]">
                      {roleLabels[selectedRole ?? 'nurse-105']}
                    </div>

                    <div className="mt-3 grid gap-3">
                      <label className="grid gap-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#7e9289]">Логин</span>
                        <div className="relative">
                          <UserRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7e9289]" size={16} />
                          <input className={cn(fieldStyles, 'pl-9')} value={typedLogin} placeholder="логин" readOnly />
                        </div>
                      </label>

                      <label className="grid gap-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#7e9289]">Пароль</span>
                        <div className="relative">
                          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7e9289]" size={16} />
                          <input className={cn(fieldStyles, 'pl-9')} value={typedPassword} placeholder="пароль" readOnly />
                        </div>
                      </label>
                    </div>

                    <div className="mt-4 min-h-12 rounded-2xl border border-[#dce9e3] bg-[#f8fbf9] p-3">
                      {loginStep === 'idle' ? (
                        <div className="text-sm text-[#62766f]">Подготовка полей входа</div>
                      ) : (
                        <div className="grid gap-2">
                          <div className="flex items-center gap-2 text-sm font-semibold text-[#17362d]">
                            <Loader2 size={17} className="animate-spin text-[#267e63]" />
                            {loginStep === 'typing' ? 'Вводим логин и пароль' : 'Открываем рабочий экран'}
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[#e6f2ed]">
                            <motion.div
                              className="h-full rounded-full bg-[#267e63]"
                              initial={{ width: '18%' }}
                              animate={{ width: loginStep === 'typing' ? '58%' : '100%' }}
                              transition={{ duration: 0.55 }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
      </div>
    </>
  )
}
