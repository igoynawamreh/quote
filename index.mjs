export const doubleQuote = str => str.replace(/'/g, '"');
export const singleQuote = str => str.replace(/"/g, "'");
export const toggleQuote = str => str.replace(/['"]/g, m0 => '"' === m0 ? "'" : '"');

function e(str, flags) {
    return new RegExp(str, flags ?? 'g');
}

// Regular expression, because there is no DOM!
const STRING_DOUBLE = `(")((?:\\\\.|[^"])*)(")`;
const STRING_SINGLE = `(')((?:\\\\.|[^'])*)(')`;
const STRING_BOTH = '(?:' + STRING_DOUBLE + '|' + STRING_SINGLE + ')';

const OBJECT_KEY = '[a-zA-Z_$][\\w]*';

export const JSON = {
    toObject: str => {
        str = str.trim();
        // Convert JSON array and object
        if (
            '{' === str.slice(0, 1) && '}' === str.slice(-1) ||
            '[' === str.slice(0, 1) && ']' === str.slice(-1)
        ) {
            return str.replace(e('([{,]\\s*)"(' + OBJECT_KEY + ')"(\\s*:)'), '$1$2$3');
        }
        return str;
    }
};

const SGML_COMMENT_REGEX = '<!--[\\s\\S]*?-->';

// Capture string pattern first, to skip `<` and `>` character(s) that exist
// in SGML attribute’s value. Example: `<b:if cond='data:posts.size > 100'>`
const SGML_TAG_REGEX = '<(?:' + STRING_BOTH + '|[^>])+>';

// CDATA section should be ignored!
const XML_TO_IGNORE = '<!\\[CDATA\\[[\\s\\S]*?\\]\\]>';

function convertNodes(str, quote, nodesToSkip) {
    let nodesToSkipRegex = nodesToSkip && nodesToSkip.map(
        nodeToSkip => '(<' + nodeToSkip + '(?:\\s[^>]*)?>)([\\s\\S]*?)(<\\/' + nodeToSkip + '>)'
    ).join('|');
    let nodes = SGML_COMMENT_REGEX;
    nodes += nodesToSkipRegex ? '|' + nodesToSkipRegex : "";
    nodes += '|' + SGML_TAG_REGEX; // Capture any SGML tag last!
    return str.replace(e(nodes), node => {
        // Skip comment node!
        if ('<!--' === node.slice(0, 4) && '-->' === node.slice(-3)) {
            return node;
        }
        // Skip the excluded node contents, but convert its attribute(s) as well!
        if (nodesToSkipRegex && e('^(' + nodesToSkipRegex + ')$').test(node)) {
            let nodeStart = e('^<(' + nodesToSkip.join('|') + ')(\\s(' + STRING_BOTH + '|[^>])*)?>');
            return node.replace(nodeStart, m0 => convertNodes(m0));
        }
        return node.replace(e('=' + STRING_BOTH), m0 => {
            if ('=' + quote === m0.slice(0, 2)) {
                return m0; // Skip!
            }
            return m0.replace(e(STRING_BOTH), (n0, quoteStart, quoteValue, quoteEnd) => {
                return quote + toggleQuote(quoteValue) + quote;
            });
        });
    });
}

export const HTML = {
    doubleQuote: str => convertNodes(str, '"', ['script', 'style', 'textarea']),
    singleQuote: str => convertNodes(str, "'", ['script', 'style', 'textarea'])
};

export const SGML = {
    doubleQuote: str => convertNodes(str, '"'),
    singleQuote: str => convertNodes(str, "'")
};

// TODO: Skip CDATA section!
export const XML = {
    doubleQuote: str => convertNodes(str, '"'),
    singleQuote: str => convertNodes(str, "'")
};
