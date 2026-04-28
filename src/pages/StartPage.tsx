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

const roleOrder: DemoRole[] = ['nurse-101', 'senior-nurse', 'manager']

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
    <div className="min-h-screen overflow-hidden bg-[#0f6b55] px-4 py-5 text-[#17362d]">
      <PageTransition className="relative mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-7xl flex-col items-center justify-center overflow-hidden rounded-[34px] bg-white shadow-[0_36px_90px_rgba(6,52,40,0.28)]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#0f6b55_0%,#2d9172_38%,#f5fbf8_38%,#ffffff_100%)]" />
        <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="absolute left-[-12%] top-[12%] h-[72%] w-[48%] rotate-[-8deg] rounded-[52px] bg-white/12" />
        <div className="absolute bottom-[-18%] right-[-10%] h-[48%] w-[54%] rotate-[-10deg] rounded-[52px] bg-[#e8f5f0]" />

        <main className="relative z-10 flex w-full flex-col items-center justify-center px-4">
          <div className="w-full max-w-3xl rounded-[34px] border border-white bg-white px-6 py-8 shadow-[0_28px_70px_rgba(15,76,60,0.22)] md:px-12 md:py-11">
            <img
              src="/brand/ultramed-main-logo.svg"
              alt="УльтраМед"
              className="mx-auto h-auto w-full max-w-[640px]"
            />
            <div className="mx-auto mt-2 max-w-[420px] text-center text-3xl font-normal leading-none text-[#6089bb] md:text-4xl">
              СНАБЖЕНИЕ
            </div>
          </div>
          <button
            type="button"
            onClick={openAuth}
            className="mt-8 inline-flex min-h-14 min-w-60 items-center justify-center gap-2 rounded-full bg-[#267e63] px-7 text-base font-semibold text-white shadow-[0_18px_34px_rgba(6,80,60,0.28)] transition hover:-translate-y-0.5 hover:bg-[#2d9172] hover:shadow-[0_24px_42px_rgba(6,80,60,0.34)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
          >
            Авторизация
            <KeyRound size={17} />
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
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#17362d]">Выберите пользователя</h2>
                  <p className="mt-1 text-sm leading-6 text-[#62766f]">
                    После выбора откроются поля логина и пароля.
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
                        'min-h-32 rounded-[22px] border p-3 text-left transition disabled:pointer-events-none',
                        active
                          ? 'border-[#70a893] bg-[#eef7f3] text-[#17362d] shadow-sm'
                          : 'border-[#dce9e3] bg-white text-[#52665f] hover:-translate-y-0.5 hover:border-[#9cc7b6] hover:shadow-[0_18px_28px_rgba(21,58,46,0.10)]',
                      )}
                    >
                      <Icon size={21} className={active ? 'text-[#267e63]' : 'text-[#6089bb]'} />
                      <div className="mt-3 font-semibold text-[#17362d]">{profile.title}</div>
                      <div className="mt-1 text-sm leading-5 text-[#62766f]">{profile.caption}</div>
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
                      {roleLabels[selectedRole ?? 'nurse-101']}
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
  )
}
