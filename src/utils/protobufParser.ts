import * as protobuf from 'protobufjs'

const protoDefinition = `
syntax = "proto3";
package pf.ptr.v1;

message Pointer {
  bytes cid = 1;

  enum MsgType {
    MSG_UNSPECIFIED = 0;
    TASK_CREATE     = 1;
    TASK_UPDATE     = 2;
    REWARD_CLAIM    = 3;
    SYS_EVENT       = 5;
    CHAT_MESSAGE    = 6;
    TEST_MESSAGE    = 8;
    ARTIFACT        = 9;
    INITIATION      = 10;
    ASSET_DEFINITION = 11;
  }
  MsgType msg_type = 2;

  enum Enc {
    ENC_NONE                   = 0;
    ENC_X25519_XCHACHA20P1305  = 1;
    ENC_AES256_GCM             = 2;
    ENC_SIGNAL_DOUBLE_RATCHET  = 3;
    ENC_FERNET                 = 4;
  }
  Enc enc = 3;

  bytes kid = 4;
  bytes nonce = 5;
  bytes bundle_id = 6;
  uint32 bundle_index = 7;
  uint32 ptr_version = 8;

  enum Compression {
    COMP_NONE = 0;
    COMP_ZSTD = 1;
    COMP_LZ4  = 2;
  }
  Compression comp = 9;

  uint32 schema = 10;
  bytes task_id = 11;
}
`

export interface ParsedPointer {
  cid?: string
  msg_type?: string
  enc?: string
  kid?: string
  nonce?: string
  bundle_id?: string
  bundle_index?: number
  ptr_version?: number
  comp?: string
  schema?: number
  task_id?: string
}

let root: protobuf.Root | null = null
let Pointer: protobuf.Type | null = null

async function initializeProtobuf() {
  if (!root) {
    root = await protobuf.parse(protoDefinition, { keepCase: true }).root
    Pointer = root.lookupType('pf.ptr.v1.Pointer')
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  )
}

export async function parsePfPtrMemo(
  hexData: string,
): Promise<ParsedPointer | null> {
  try {
    await initializeProtobuf()

    if (!Pointer) {
      // eslint-disable-next-line no-console
      console.error('Failed to initialize protobuf')
      return null
    }

    // Convert hex string to bytes
    const bytes = new Uint8Array(
      hexData.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [],
    )

    // Decode the protobuf message
    const message = Pointer.decode(bytes)
    const obj = Pointer.toObject(message, {
      longs: String,
      enums: String,
      bytes: String,
      defaults: false,
    })

    // Map enum values to their names
    const msgTypeEnum = Pointer.lookupEnum('MsgType')
    const encEnum = Pointer.lookupEnum('Enc')
    const compEnum = Pointer.lookupEnum('Compression')

    const result: ParsedPointer = {}

    if (obj.cid) {
      result.cid =
        typeof obj.cid === 'string'
          ? obj.cid
          : bytesToHex(obj.cid as Uint8Array)
    }

    if (obj.msg_type !== undefined) {
      result.msg_type =
        msgTypeEnum.valuesById[obj.msg_type] || `UNKNOWN(${obj.msg_type})`
    }

    if (obj.enc !== undefined) {
      result.enc = encEnum.valuesById[obj.enc] || `UNKNOWN(${obj.enc})`
    }

    if (obj.kid) {
      result.kid =
        typeof obj.kid === 'string'
          ? obj.kid
          : bytesToHex(obj.kid as Uint8Array)
    }

    if (obj.nonce) {
      result.nonce =
        typeof obj.nonce === 'string'
          ? obj.nonce
          : bytesToHex(obj.nonce as Uint8Array)
    }

    if (obj.bundle_id) {
      result.bundle_id =
        typeof obj.bundle_id === 'string'
          ? obj.bundle_id
          : bytesToHex(obj.bundle_id as Uint8Array)
    }

    if (obj.bundle_index !== undefined && obj.bundle_index !== 0) {
      result.bundle_index = obj.bundle_index
    }

    if (obj.ptr_version !== undefined && obj.ptr_version !== 0) {
      result.ptr_version = obj.ptr_version
    }

    if (obj.comp !== undefined) {
      result.comp = compEnum.valuesById[obj.comp] || `UNKNOWN(${obj.comp})`
    }

    if (obj.schema !== undefined && obj.schema !== 0) {
      result.schema = obj.schema
    }

    if (obj.task_id) {
      result.task_id =
        typeof obj.task_id === 'string'
          ? obj.task_id
          : bytesToHex(obj.task_id as Uint8Array)
    }

    return result
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error parsing protobuf memo:', error)
    return null
  }
}
