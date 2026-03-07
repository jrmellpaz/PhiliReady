import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useState } from 'react'
import { login } from '#/lib/api'
import { setToken } from '#/lib/auth'
import { useSheetState } from '#/lib/sheet-state'

const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export function LoginContent() {
  const { close } = useSheetState()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { email: '', password: '' },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        const parsed = loginSchema.parse(value)
        const res = await login(parsed.email, parsed.password)
        setToken(res.accessToken)
        close()
        window.location.reload()
      } catch (err: unknown) {
        if (err instanceof z.ZodError) {
          setServerError(err.issues[0]?.message ?? 'Validation error')
        } else if (err instanceof Error) {
          setServerError(err.message || 'Login failed')
        } else {
          setServerError('Login failed')
        }
      }
    },
  })

  return (
    <div className="login-card">
      <h1 className="login-title">Sign In</h1>
      <p className="login-subtitle">Access PhiliReady dashboard features</p>

      <form
        className="login-form"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <form.Field name="email">
          {(field) => (
            <div className="login-field">
              <label className="login-label" htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                className="login-input"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                required
              />
              {field.state.meta.errors.length > 0 && (
                <p className="login-error">
                  {field.state.meta.errors.join(', ')}
                </p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <div className="login-field">
              <label className="login-label" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                className="login-input"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                required
              />
              {field.state.meta.errors.length > 0 && (
                <p className="login-error">
                  {field.state.meta.errors.join(', ')}
                </p>
              )}
            </div>
          )}
        </form.Field>

        {serverError && <p className="login-error">{serverError}</p>}

        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <button
              type="submit"
              className="login-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </button>
          )}
        </form.Subscribe>
      </form>
    </div>
  )
}
