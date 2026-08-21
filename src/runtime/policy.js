import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export class RuntimePolicyError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'RuntimePolicyError';
    this.code = code;
    this.details = details;
  }
}

const SEMVER_PATTERN = /^(?:v)?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export function parseNodeVersion(version) {
  if (typeof version !== 'string') throw new RuntimePolicyError('MALFORMED_NODE_VERSION', 'A versão do Node.js deve ser texto.');
  const match = version.trim().match(SEMVER_PATTERN);
  if (!match) throw new RuntimePolicyError('MALFORMED_NODE_VERSION', `A versão do Node.js é inválida: ${version}.`);
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), raw: version.trim() };
}

export function validateRuntimePolicy(policy) {
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) throw new RuntimePolicyError('INVALID_RUNTIME_POLICY', 'A política de runtime deve ser um objeto JSON.');
  if (policy.formatVersion !== 1) throw new RuntimePolicyError('INVALID_RUNTIME_POLICY', 'A versão da política de runtime não é suportada.');
  if (!Array.isArray(policy.homologatedMajorLines) || policy.homologatedMajorLines.length === 0 || policy.homologatedMajorLines.some((major) => !Number.isInteger(major) || major < 1)) {
    throw new RuntimePolicyError('INVALID_RUNTIME_POLICY', 'As linhas homologadas do Node.js são inválidas.');
  }
  if (new Set(policy.homologatedMajorLines).size !== policy.homologatedMajorLines.length) throw new RuntimePolicyError('INVALID_RUNTIME_POLICY', 'As linhas homologadas do Node.js não podem se repetir.');
  if (!policy.homologatedMajorLines.includes(policy.preferredMajor)) throw new RuntimePolicyError('INVALID_RUNTIME_POLICY', 'A linha preferida precisa ser homologada.');
  const installVersion = parseNodeVersion(policy.approvedAutomaticInstallVersion);
  if (installVersion.major !== policy.preferredMajor) throw new RuntimePolicyError('INVALID_RUNTIME_POLICY', 'A versão de instalação automática precisa pertencer à linha preferida.');
  if (typeof policy.wingetPackage !== 'string' || !policy.wingetPackage) throw new RuntimePolicyError('INVALID_RUNTIME_POLICY', 'O pacote winget aprovado é obrigatório.');
  return Object.freeze({
    ...policy,
    homologatedMajorLines: Object.freeze([...policy.homologatedMajorLines]),
  });
}

export async function loadRuntimePolicy(policyPath = resolve(process.cwd(), 'resources', 'runtime-policy.json')) {
  let text;
  try { text = await readFile(policyPath, 'utf8'); } catch (cause) {
    throw new RuntimePolicyError('RUNTIME_POLICY_READ_FAILED', `Não foi possível ler a política de runtime: ${policyPath}.`, { policyPath, cause });
  }
  try { return validateRuntimePolicy(JSON.parse(text)); } catch (cause) {
    if (cause instanceof RuntimePolicyError) throw cause;
    throw new RuntimePolicyError('INVALID_RUNTIME_POLICY', `A política de runtime contém JSON inválido: ${policyPath}.`, { policyPath, cause });
  }
}

export function validateNodeRuntimeVersion(version, policy) {
  const parsed = parseNodeVersion(version);
  const validatedPolicy = validateRuntimePolicy(policy);
  if (!validatedPolicy.homologatedMajorLines.includes(parsed.major)) {
    return { valid: false, code: 'NODE_MAJOR_NOT_HOMOLOGATED', version: parsed, message: `A linha Node.js ${parsed.major} não é homologada para o Meminify.` };
  }
  return { valid: true, version: parsed, preferred: parsed.major === validatedPolicy.preferredMajor };
}
