"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeHtml = sanitizeHtml;
function sanitizeHtml(input) {
    if (!input)
        return '';
    if (typeof window === 'undefined')
        return input;
    const allowedTags = new Set([
        'a',
        'b',
        'blockquote',
        'br',
        'code',
        'div',
        'em',
        'h1',
        'h2',
        'h3',
        'hr',
        'i',
        'li',
        'ol',
        'p',
        'pre',
        's',
        'span',
        'strike',
        'strong',
        'u',
        'ul',
    ]);
    const allowedAttrs = new Set(['href', 'target', 'rel', 'class']);
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${input}</div>`, 'text/html');
    const root = doc.body.firstElementChild;
    if (!root)
        return '';
    const walk = (node) => {
        const children = Array.from(node.children);
        for (const child of children)
            walk(child);
        const tag = node.tagName.toLowerCase();
        if (!allowedTags.has(tag)) {
            const parent = node.parentElement;
            if (parent) {
                const text = doc.createTextNode(node.textContent || '');
                parent.replaceChild(text, node);
            }
            return;
        }
        for (const attr of Array.from(node.attributes)) {
            const name = attr.name.toLowerCase();
            if (name.startsWith('on') || name === 'style') {
                node.removeAttribute(attr.name);
                continue;
            }
            if (!allowedAttrs.has(name)) {
                node.removeAttribute(attr.name);
            }
        }
        if (tag === 'a') {
            const href = node.getAttribute('href') || '';
            if (!href || href.toLowerCase().startsWith('javascript:')) {
                node.removeAttribute('href');
            }
            node.setAttribute('rel', 'noopener noreferrer');
            if (node.getAttribute('target') === '_blank') {
                node.setAttribute('target', '_blank');
            }
            else {
                node.removeAttribute('target');
            }
        }
    };
    for (const el of Array.from(root.children))
        walk(el);
    return root.innerHTML;
}
