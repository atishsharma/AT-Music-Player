export type RuleField = 'title' | 'artist' | 'album' | 'duration' | 'plays' | 'plays30' | 'added' | 'lastPlayed' | 'source';
export interface Rule { field: RuleField; op: string; value: string | number }
export interface SmartDef {
    id?: number | string;
    name: string;
    match: 'all' | 'any';
    rules: Rule[];
    sort: 'plays' | 'added' | 'lastPlayed' | 'title' | 'artist' | 'random';
    limit: number;
    builtin?: boolean;
    description?: string;
    count?: number;
}

type Kind = 'text' | 'number' | 'days' | 'source';
export const FIELDS: { v: RuleField; label: string; kind: Kind; unit?: string }[] = [
    { v: 'title', label: 'Title', kind: 'text' },
    { v: 'artist', label: 'Artist', kind: 'text' },
    { v: 'album', label: 'Album', kind: 'text' },
    { v: 'duration', label: 'Length', kind: 'number', unit: 'min' },
    { v: 'plays', label: 'Play count', kind: 'number', unit: 'plays' },
    { v: 'plays30', label: 'Plays this month', kind: 'number', unit: 'plays' },
    { v: 'added', label: 'Date added', kind: 'days', unit: 'days' },
    { v: 'lastPlayed', label: 'Last played', kind: 'days', unit: 'days' },
    { v: 'source', label: 'Source', kind: 'source' },
];

export const OPS: Record<Kind, { v: string; label: string }[]> = {
    text: [{ v: 'contains', label: 'contains' }, { v: 'notContains', label: "doesn't contain" }, { v: 'is', label: 'is' }, { v: 'startsWith', label: 'starts with' }],
    number: [{ v: 'gt', label: 'more than' }, { v: 'lt', label: 'less than' }, { v: 'eq', label: 'exactly' }],
    days: [{ v: 'within', label: 'in the last' }, { v: 'notWithin', label: 'not in the last' }],
    source: [{ v: 'is', label: 'is' }],
};

export const SORTS: { v: SmartDef['sort']; label: string }[] = [
    { v: 'plays', label: 'Most played' },
    { v: 'added', label: 'Recently added' },
    { v: 'lastPlayed', label: 'Recently played' },
    { v: 'title', label: 'Title' },
    { v: 'artist', label: 'Artist' },
    { v: 'random', label: 'Random' },
];

export const fieldKind = (f: RuleField) => FIELDS.find(x => x.v === f)?.kind ?? 'text';

export const defaultRule = (field: RuleField = 'artist'): Rule => {
    const kind = fieldKind(field);
    return { field, op: OPS[kind][0].v, value: kind === 'text' ? '' : kind === 'source' ? 'local' : kind === 'days' ? 30 : 1 };
};

export const emptyDef = (): SmartDef => ({ name: '', match: 'all', rules: [defaultRule()], sort: 'plays', limit: 100 });
