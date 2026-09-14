export function dataTransferHasFiles(dataTransfer: DataTransfer | null) {
  if (!dataTransfer) {
    return false
  }

  return Array.from(dataTransfer.types).includes("Files")
}

export function isJsonFile(file: File) {
  const name = file.name.toLowerCase()
  return file.type === "application/json" || name.endsWith(".json")
}

export async function readJsonFromDataTransfer(
  dataTransfer: DataTransfer
): Promise<{ ok: true; text: string } | { ok: false; message: string }> {
  const files = Array.from(dataTransfer.files)
  if (files.length === 0) {
    return { ok: false, message: "Drop a .json roadmap file." }
  }

  const file = files.find(isJsonFile)
  if (!file) {
    return { ok: false, message: "Drop a .json roadmap file." }
  }

  return { ok: true, text: await file.text() }
}
