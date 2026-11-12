/**
 * Regression tests for `unknown prompt variable "{{cwd}}"`.
 *
 * DSH 0.2.1 dropped the `cwd` prompt variable: `@deepseek-ai/dsh-agent-loop`
 * registers only `provider` and `model`, and `renderPrompt()` in
 * `@deepseek-ai/dsh-system-prompt` throws for any `{{name}}` missing from the
 * registry:
 *
 *   unknown prompt variable "{{cwd}}" in section "deployment:persona-suffix";
 *   registered variables: provider, model
 *
 * On a 0.2.0 host the same text is fine, so the bug only shows up on someone
 * else's newer DSH. purge must therefore never leave `{{cwd}}` for the host to
 * interpolate — it fills the working directory itself at assemble time — and it
 * must sanitize *every* section, including text written by other plugins.
 */

import { describe, expect, it } from 'vitest'

import {
  cwdOfContext,
  escapeDshInterpolation,
  materializeCwd,
  rewritePromptAssembly,
  sanitizeVariablesInText,
} from '../packages/dsh-purge/lib/identity.js'

const CWD = 'D:/Extends/AgentWorkspace/DSH'

/** The two variables every supported host registers. */
const NEW_HOST = { provider: 'workbuddy-xdpool', model: 'deepseek-v4.1-flash' }

function context(cwd: string = CWD) {
  return { agent: { session: { header: { cwd } } } }
}

/** Every `{{name}}` the host would try to interpolate. */
function variablesIn(text: string): string[] {
  return [...String(text ?? '').matchAll(/\{\{([^{}]*)\}\}/g)].map((match) => match[1] ?? '')
}

describe('prompt variables the host no longer registers', () => {
  it('fills {{cwd}} with the working directory instead of leaving it to the host', () => {
    expect(materializeCwd('Your working directory is {{cwd}}.', CWD))
      .toBe(`Your working directory is ${CWD}.`)
    expect(materializeCwd('Working directory: {{cwd}}. Read it.', CWD))
      .toBe(`Working directory: ${CWD}. Read it.`)
  })

  it('drops every {{cwd}} occurrence, not just the first', () => {
    const out = materializeCwd('{{cwd}} and {{cwd}} and {{cwd}}', CWD)
    expect(out).toBe(`${CWD} and ${CWD} and ${CWD}`)
    expect(out).not.toContain('{{cwd}}')
  })

  it('renders a placeholder when the host gives no working directory', () => {
    expect(materializeCwd('Your working directory is {{cwd}}.', '')).toBe(
      'Your working directory is [workspace].',
    )
  })

  it('never leaves a live {{cwd}} behind, even inside inject text', () => {
    // The inject body may quote the old suffix; escapeDshInterpolation is the
    // path that used to whitelist cwd and pass it straight through.
    const out = escapeDshInterpolation('Your working directory is {{cwd}}.', CWD)
    expect(out).toBe(`Your working directory is ${CWD}.`)
    expect(out).not.toContain('{{cwd}}')
  })

  it('keeps the variables the host still owns', () => {
    expect(sanitizeVariablesInText('model={{model}} provider={{provider}}', NEW_HOST, CWD))
      .toBe('model={{model}} provider={{provider}}')
  })

  it('defuses an unknown variable instead of letting renderPrompt throw', () => {
    const out = sanitizeVariablesInText('a={{cwd}} b={{whatever}}', NEW_HOST, CWD)
    expect(out).toBe(`a=${CWD} b={ {whatever}}`)
    expect(variablesIn(out).every((name) => name === 'model' || name === 'provider')).toBe(true)
  })

  it('falls back to model/provider when the host exposes no variable table', () => {
    const out = sanitizeVariablesInText('x={{cwd}} y={{model}}', undefined, CWD)
    expect(out).toBe(`x=${CWD} y={{model}}`)
  })

  it('reads the working directory off the session, then off the process', () => {
    expect(cwdOfContext(context())).toBe(CWD)
    expect(cwdOfContext({ agent: { session: { header: {} } } })).toBe(process.cwd())
    expect(cwdOfContext(undefined)).toBe(process.cwd())
  })
})

describe('rewritePromptAssembly on a host without the cwd variable', () => {
  /** What a fresh 0.2.1 host assembles: persona prefix/suffix plus the old identity line. */
  function assembly() {
    return {
      sections: [
        { name: 'deployment:persona-prefix', text: '' },
        {
          name: 'deployment:persona-suffix',
          text: 'Your working directory is {{cwd}}.',
          order: 10200,
        },
        {
          name: 'harness:identity',
          text: 'You are a coding agent powered by the {{model}} model.',
        },
      ],
      contexts: [{ name: 'runtime', text: 'cwd={{cwd}}' }],
      tools: [],
      variables: { ...NEW_HOST },
    }
  }

  it('leaves no unregistered variable for the host to interpolate', () => {
    const out = rewritePromptAssembly(assembly(), { fallbackInject: '', context: context() })
    const registered = new Set(Object.keys(out.variables ?? NEW_HOST))
    const texts = [
      ...out.sections.map((section: { text?: string }) => section.text ?? ''),
      ...out.contexts.map((item: { text?: string }) => item.text ?? ''),
    ]
    for (const text of texts) {
      for (const name of variablesIn(text)) expect(registered.has(name)).toBe(true)
    }
    expect(texts.join('\n')).not.toContain('{{cwd}}')
  })

  it('keeps the working directory visible to the model', () => {
    const out = rewritePromptAssembly(assembly(), { fallbackInject: '', context: context() })
    const joined = out.sections
      .map((section: { text?: string }) => section.text ?? '')
      .join('\n\n')
    expect(joined).toContain(CWD)
  })

  it('does not mutate the assembly it was handed', () => {
    const input = assembly()
    rewritePromptAssembly(input, { fallbackInject: '', context: context() })
    expect(input.sections[1]?.text).toBe('Your working directory is {{cwd}}.')
    expect(input.contexts[0]?.text).toBe('cwd={{cwd}}')
  })

  it('sanitizes a section another plugin wrote', () => {
    const input = assembly()
    input.sections.push({
      // Not a dsh-purge / dshpg section: purge must still make it safe.
      name: 'third-party:notes',
      text: 'workspace is {{cwd}} and flavour is {{flavour}}',
    })
    const out = rewritePromptAssembly(input, { fallbackInject: '', context: context() })
    const third = out.sections.find(
      (section: { name?: string }) => section.name === 'third-party:notes',
    ) as { text?: string } | undefined
    expect(third?.text ?? '').not.toContain('{{cwd}}')
    expect(third?.text ?? '').toContain(CWD)
    expect(variablesIn(third?.text ?? '')).toEqual([])
  })
})
