// 浏览器与服务端共用的官方红包引用解析；这里不请求平台或领取红包。
import {fishActivityId,fishShareCode} from './fish-ecoji.js?v=98ddcc7d'
export const packetText = (v) => String(v ?? '').normalize('NFC').trim();
// 兼容已有分享脚本的可逆口令格式；解析聊天正文时不请求外站。
export function decodeSharedCode(value) {
    try {
        if (value.length > 240)
            return '';
        let steps = '';
        let decoded = value;
        if (value.startsWith('base64:')) {
            steps = 'b';
            decoded = value.slice(7);
        }
        else if (value.startsWith('enc1:')) {
            const match = /^enc1:([bhurs]{1,5}):(.{1,240})$/.exec(value);
            if (!match)
                return '';
            steps = match[1];
            decoded = match[2];
        }
        const utf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false });
        for (const step of [...steps].reverse()) {
            if (step === 'b') {
                if (!/^[A-Za-z0-9+/]+={0,2}$/.test(decoded))
                    return '';
                decoded = utf8.decode(Uint8Array.from(atob(decoded), c => c.charCodeAt(0)));
            }
            else if (step === 'h') {
                if (!/^(?:[0-9a-f]{2})+$/i.test(decoded))
                    return '';
                decoded = utf8.decode(Uint8Array.from(decoded.match(/../g), pair => parseInt(pair, 16)));
            }
            else if (step === 'u')
                decoded = decodeURIComponent(decoded);
            else if (step === 'r')
                decoded = [...decoded].reverse().join('');
            else if (step === 's') {
                const match = /^([0-9a-f]{16})\.([A-Za-z0-9_-]+)$/.exec(decoded);
                if (!match)
                    return '';
                const salt = Uint8Array.from(match[1].match(/../g), pair => parseInt(pair, 16));
                const payload = match[2].replace(/-/g, '+').replace(/_/g, '/');
                decoded = utf8.decode(Uint8Array.from(atob(payload), (c, i) => c.charCodeAt(0) ^ salt[i % salt.length]));
            }
            if (decoded.length > 240)
                return '';
        }
        return decoded;
    }
    catch {
        return '';
    }
}
// 只收录能唯一识别的红包。别人的普通消息不会触发外站请求或领取。
export function sharedPacket(body) {
    if (/[\p{Cf}\x00-\x08\x0b\x0c\x0e-\x1f]/u.test(body))
        return null;
    const found = [];
    let hbLink = false;
    for (const token of body.match(/https:\/\/[^\s<>"'，。！？）)\]】]+/gi) || []) {
        try {
            const url = new URL(token);
            const provider = url.hostname === 'credit.linux.do' ? 'credit' : ['hb.lafi.sh','meme.442224.xyz'].includes(url.hostname) ? 'fish' : '';
            if (provider)
                found.push(cleanPacketReference({ provider, external_ref: token }));
            if (url.origin === 'https://hb.unsnow.org' && !url.username && !url.password) {
                hbLink = true;
                if (url.pathname !== '/')
                    found.push(cleanPacketReference({ provider: 'hb', external_ref: token }));
            }
        }
        catch { /* 非官方红包链接忽略 */ }
    }
    if ((hbLink || /(?:^|[\s，,（(【\[])\s*(?:https:\/\/)?hb\.unsnow\.org\/?(?=$|[\s，,。)）\]】])/i.test(body)) && /红包/.test(body)) {
        const codes = [...body.matchAll(/(?:输入\s*)?口令\s*[:：]?\s*(\d{8})(?!\d)/g)];
        for (const match of codes)
            found.push(cleanPacketReference({ provider: 'hb', external_ref: match[1] }));
        for (const match of body.matchAll(/(?:输入\s*)?口令\s*[:：]?\s*(?:([`｀])([^\r\n`｀]{1,240})\1|([^\s`｀，。]{1,240}))(?:\s*领取)?/g)) {
            const shared = (match[2] || match[3] || '').trim();
            const decoded = decodeSharedCode(match[2] ? shared : shared.replace(/领取$/, ''));
            if ([...decoded].length >= 6 && [...decoded].length <= 18 && /^[\p{Script=Han}A-Za-z0-9]+$/u.test(decoded) && (!/^\d+$/.test(decoded) || decoded.length === 8))
                found.push(cleanPacketReference({ provider: 'hb', external_ref: decoded }));
        }
    }
    const unique = new Map(found.map(p => [p.provider + ':' + p.external_ref, p]));
    if (unique.size !== 1) return null;
    const packet = [...unique.values()][0];
    if (packet.provider !== 'fish' || packet.external_kind !== 'id') return packet;
    const codes = new Set([...body.matchAll(/(?:^|\r?\n)[ \t]*(?:输入[ \t]*)?口令[ \t]*[:：][ \t]*([^\r\n]+)/gmu)]
      .map(match => match[1].trim().replace(/[。！!，,]+$/u, ''))
      .filter(code => [...code].length >= 6 && [...code].length <= 18 && /^[\p{Script=Han}A-Za-z0-9]+$/u.test(code)));
    return codes.size === 1 ? {...packet, external_code:[...codes][0]} : packet;
}
export function parsePacketReference(value, provider = 'auto') {
    const input = packetText(value);
    if (!input || input.length > 2000)
        throw new Error('请粘贴一条红包分享内容、官方链接或口令（最多2000字）');
    if (/[\p{Cf}\x00-\x08\x0b\x0c\x0e-\x1f]/u.test(input))
        throw new Error('红包分享内容不能包含控制字符');
    if (!['auto', 'hb', 'credit', 'fish'].includes(provider))
        throw new Error('请选择支持的红包平台');
    // 完整URL严格校验，避免带凭据、查询参数的URL被宽松提取。
    if (/^https:\/\/\S+$/i.test(input) && !/[。，！）)]$/.test(input)) {
        let detected = '';
        try { detected = ({'hb.unsnow.org':'hb','credit.linux.do':'credit','hb.lafi.sh':'fish','meme.442224.xyz':'fish'})[new URL(input).hostname] || ''; } catch {}
        if (!detected || (provider !== 'auto' && provider !== detected))
            throw new Error('红包链接与所选平台不一致');
        return cleanPacketReference({provider:detected, external_ref:input});
    }
    const shared = sharedPacket(input);
    if (shared) {
        if (provider !== 'auto' && provider !== shared.provider)
            throw new Error('红包分享内容与所选平台不一致');
        return shared;
    }
    if (/https?:\/\/|hb\.unsnow\.org|hb\.lafi\.sh|\s/.test(input))
        throw new Error('未能识别唯一红包，请一次粘贴一个官方分享链接或完整分享内容');
    if (provider === 'auto')
        throw new Error('只有口令或编号时，请先选择所属平台');
    return cleanPacketReference({provider, external_ref:input});
}
export function cleanExternalPacket(body) {
    if (!body.provider || body.provider === 'native')
        return {provider:'native', external_ref:'', external_kind:''};
    const packet = parsePacketReference(body.external_ref, String(body.provider));
    const code = packetText(body.external_code);
    if (code && !/^[\p{Script=Han}A-Za-z0-9]{6,18}$/u.test(code)) throw new Error('活动口令需要6–18字中英文或数字');
    return code ? {...packet, external_code: code} : packet;
}
export function packetReferenceUrl(packet) {
    const {provider, external_ref:ref, external_kind:kind} = packet;
    if (provider === 'credit') return 'https://credit.linux.do/redenvelope/' + encodeURIComponent(ref);
    if (provider === 'fish') return kind === 'id' ? 'https://hb.lafi.sh/🧧/' + encodeURIComponent(fishShareCode(ref) || ref) : 'https://hb.lafi.sh/';
    if (provider === 'hb') return 'https://hb.unsnow.org/' + (kind === 'id' ? 'hb/' : kind === 'numeric' ? 'code/' : 'text-code/') + encodeURIComponent(ref);
    throw new Error('请选择支持的红包平台');
}
export function cleanPacketReference(b) {
    const provider = String(b.provider || 'native');
    if (provider === 'native')
        return { provider, external_ref: '', external_kind: '' };
    let ref = packetText(b.external_ref);
    if (/[\p{Cc}\p{Cf}]/u.test(ref))
        throw new Error('红包链接或口令不能包含控制字符');
    if (provider === 'fish') {
        if (/^https:/i.test(ref)) {
            const url = new URL(ref);
            if (!['https://hb.lafi.sh','https://meme.442224.xyz'].includes(url.origin) || url.username || url.password || url.hash)
                throw new Error('请粘贴 fish 官方活动链接');
            const path=decodeURIComponent(url.pathname)
            const image=path.match(/^\/🧧\/([^/]+)\/🖼️?\.svg$/u)
            if(url.search && (!image || [...url.searchParams.keys()].length!==1 || !/^[A-Za-z][A-Za-z0-9_+-]*(?:\/[A-Za-z0-9_+-]+)*$/.test(url.searchParams.get('tz')||'')))
                throw new Error('请粘贴 fish 官方活动链接');
            ref=path.match(/^\/activities\/([a-f0-9-]{36})\/?$/i)?.[1]
              || fishActivityId(path.match(/^\/🧧\/([^/]+)\/?$/u)?.[1]||image?.[1]) || '';
        }
        else ref=fishActivityId(ref)||ref;
        if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(ref))
            return { provider, external_ref: ref, external_kind: 'id' };
        if ([...ref].length >= 6 && [...ref].length <= 18 && /^[\p{Script=Han}A-Za-z0-9]+$/u.test(ref))
            return { provider, external_ref: ref, external_kind: 'text' };
        throw new Error('Fish 需要官方红包链接、14位表情码、UUID 或6–18字中英文数字口令');
    }
    if (provider === 'credit') {
        if (/^https:/i.test(ref)) {
            const url = new URL(ref);
            if (url.origin !== 'https://credit.linux.do' || url.username || url.password || url.search || url.hash)
                throw new Error('请粘贴 Credit 官方红包分享链接');
            ref = url.pathname.match(/^\/redenvelope\/([1-9][0-9]{0,19})\/?$/)?.[1] || '';
        }
        if (!/^[1-9][0-9]{0,19}$/.test(ref))
            throw new Error('Credit 红包编号或链接无效');
        return { provider, external_ref: ref, external_kind: 'id' };
    }
    if (provider !== 'hb')
        throw new Error('请选择支持的红包平台');
    if (/^https:/i.test(ref)) {
        const url = new URL(ref);
        if (url.origin !== 'https://hb.unsnow.org' || url.username || url.password || url.search || url.hash)
            throw new Error('请粘贴 HB 官方红包链接');
        const id = url.pathname.match(/^\/hb\/([A-Za-z0-9]{1,100})\/?$/)?.[1];
        if (id)
            return { provider, external_ref: id, external_kind: 'id' };
        const code = url.pathname.match(/^\/(?:code|text-code)\/([^/]+)\/?$/)?.[1];
        if (!code)
            throw new Error('HB 红包链接无效');
        ref = decodeURIComponent(code);
    }
    if (/^[0-9]{8}$/.test(ref))
        return { provider, external_ref: ref, external_kind: 'numeric' };
    if ([...ref].length < 6 || [...ref].length > 18 || !/^[\p{Script=Han}A-Za-z0-9]+$/u.test(ref))
        throw new Error('HB 需要官方红包链接、8位数字口令或6–18字中英文数字口令');
    return { provider, external_ref: ref, external_kind: 'text' };
}
