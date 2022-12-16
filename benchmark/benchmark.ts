import {Bench} from 'tinybench'
import {Defaults, encrypt_v1, encrypt_v2, generateEncryptionKey} from '../src/index'
import {generateRandomKey} from '../src/utils'

const PAYLOAD_SIZE_2KB = 2048
const PAYLOAD_SIZE_1MB = 1048576

function getRandomBytes(size: number) {
  const MAX_BUFFER_SIZE = 64000
  const result = new Uint8Array(size)
  let offset = 0
  while (offset < size) {
    const bufferSize = Math.min(size - offset, MAX_BUFFER_SIZE)
    const buffer = new Uint8Array(bufferSize)
    crypto.getRandomValues(buffer)
    result.set(buffer, offset)
    offset = offset + bufferSize
  }
  return result
}

function bytesToString(bytes: Uint8Array) {
  let str = ''
  for (let i = 0; i < bytes.length; i++) {
    str += bytes[i]
  }
  return str
}

function getRandomString(byteSize: number) {
  return bytesToString(getRandomBytes(byteSize))
}

async function runBenchmark(size: number) {
  const bench = new Bench({time: 50})
  const key = await generateEncryptionKey()
  const nonce = await generateRandomKey(Defaults.EncryptionNonceLength)
  let plaintext = ''

  bench.setup = () => {
    plaintext = bytesToString(getRandomBytes(size))
  }

  bench
    .add('encrypt_v1', async () => {
      const result = await encrypt_v1({key, plaintext, nonce})
    })
    .add('encrypt_v2', async () => {
      const result = await encrypt_v2({key, plaintext, nonce})
    })

  await bench.warmup()
  await bench.run()

  console.table(
    bench.tasks.map(({name, result}) => ({
      'Task Name': name,
      'operations per second': result?.hz,
      'average time (ms)': result?.period,
      error: result?.error,
    })),
  )
}

function trimEnd(str: string, character: string) {
  while (str.endsWith(character)) {
    str = str.slice(0, str.length - 1)
  }
  return str
}

function cleanBase64(str: string) {
  return trimEnd(str, '=').replace(/[_+-/]/g, '')
}

async function validate() {
  const key = await generateEncryptionKey()
  const plaintext = getRandomString(PAYLOAD_SIZE_2KB)
  const nonce = await generateRandomKey(Defaults.EncryptionNonceLength)

  const result1 = cleanBase64(await encrypt_v1({key, plaintext, nonce}))
  const result2 = cleanBase64(await encrypt_v2({key, plaintext, nonce}))

  if (result1 != result2) {
    console.error('result1:', result1)
    console.error('result2:', result2)
    throw new Error('result1 != result2')
  }
}

async function main() {
  await validate()

  console.log('Running benchmark for 2KB payload')
  await runBenchmark(PAYLOAD_SIZE_2KB)

  console.log('Running benchmark for 1MB payload')
  await runBenchmark(PAYLOAD_SIZE_1MB)

  console.log('Running benchmark for 5MB payload')
  await runBenchmark(PAYLOAD_SIZE_1MB * 5)
}

main()
