export type ExternalPacket = {provider:string;external_ref:string;external_kind:string}
export function packetText(value:unknown):string
export function decodeSharedCode(value:string):string
export function sharedPacket(body:string):ExternalPacket|null
export function cleanExternalPacket(body:Record<string,unknown>):ExternalPacket
export function parsePacketReference(value:unknown,provider?:string):ExternalPacket
export function packetReferenceUrl(packet:ExternalPacket):string
