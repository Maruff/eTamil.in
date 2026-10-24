// A project: a few named programs kept together.
//
// The browser's compiler cannot import (see etamil-vocabulary.js), so the files of a
// project do not refer to each other. Each runs on its own; the project is a way to keep
// several programs, switch between them, and move them as one file.
//
// Pure: no DOM and no CodeMirror, so it runs under plain Node in the unit tests. Every
// function returns a new project and leaves its argument alone.
//
//   project = { files: [{ name, doc }], active: <a file name> }

export const EXTENSION = '.qmz'
export const DEFAULT_NAME = 'en_niral.qmz'
const FORMAT = 'etamil-project'
const VERSION = 1
const MAX_NAME = 64

/** A file name a person typed, made safe: no path, no characters a download would reject. */
export function cleanName(raw) {
  if (typeof raw !== 'string') return null
  // eslint-disable-next-line no-control-regex
  // Only the last path segment: a name that climbs out of a folder is a name, not a path.
  let name = raw.split(/[\\/]/).pop().replace(/[\u0000-\u001f:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim()
  name = name.replace(/^\.+/, '')
  if (!name) return null
  if (!/\.[^.\s]+$/.test(name)) name += EXTENSION
  if (name.length > MAX_NAME) {
    const dot = name.lastIndexOf('.')
    name = name.slice(0, MAX_NAME - (name.length - dot)) + name.slice(dot)
  }
  return name
}

/** `name`, or `name` with -2, -3, ... before the extension, whichever no file has yet. */
export function uniqueName(name, taken) {
  const used = new Set(taken)
  if (!used.has(name)) return name
  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  for (let n = 2; ; n++) {
    const candidate = `${stem}-${n}${ext}`
    if (!used.has(candidate)) return candidate
  }
}

export const names = (project) => project.files.map((f) => f.name)
export const fileNamed = (project, name) => project.files.find((f) => f.name === name)

export function makeProject(doc, name = DEFAULT_NAME) {
  return { files: [{ name, doc }], active: name }
}

/** The project with a new file, which becomes the active one. */
export function addFile(project, rawName, doc = '') {
  const name = uniqueName(cleanName(rawName) ?? DEFAULT_NAME, names(project))
  return { files: [...project.files, { name, doc }], active: name }
}

/** Renamed, or the project unchanged if the new name is unusable or another file's. */
export function renameFile(project, from, rawName) {
  const to = cleanName(rawName)
  if (!to || to === from || !fileNamed(project, from)) return project
  if (names(project).includes(to)) return project
  return {
    files: project.files.map((f) => (f.name === from ? { ...f, name: to } : f)),
    active: project.active === from ? to : project.active,
  }
}

/** Without the file; the last file cannot be removed. The next one over becomes active. */
export function removeFile(project, name) {
  const index = project.files.findIndex((f) => f.name === name)
  if (index < 0 || project.files.length === 1) return project
  const files = project.files.filter((f) => f.name !== name)
  const active = project.active === name ? files[Math.min(index, files.length - 1)].name : project.active
  return { files, active }
}

export function setActive(project, name) {
  return fileNamed(project, name) ? { ...project, active: name } : project
}

/** The active file's text replaced, which is how the editor's content gets back in. */
export function setDoc(project, name, doc) {
  return { ...project, files: project.files.map((f) => (f.name === name ? { ...f, doc } : f)) }
}

export function serialize(project) {
  return JSON.stringify({ format: FORMAT, version: VERSION, active: project.active, files: project.files }, null, 2)
}

/** A project from its JSON, or null if it is not one of ours or is damaged. */
export function parse(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    return null
  }
  if (!data || data.format !== FORMAT || data.version !== VERSION || !Array.isArray(data.files)) return null
  const files = []
  for (const entry of data.files) {
    if (!entry || typeof entry.doc !== 'string') return null
    const name = cleanName(entry.name)
    if (!name) return null
    files.push({ name: uniqueName(name, files.map((f) => f.name)), doc: entry.doc })
  }
  if (files.length === 0) return null
  const active = files.some((f) => f.name === data.active) ? data.active : files[0].name
  return { files, active }
}
