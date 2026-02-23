export type OperatorMeta = {
  name: string;
  shortName?: string;
};

// Operator mapping dictionary - add real operator IDs here
export const OPERATORS: Record<string, OperatorMeta> = {
  OP_1: { name: "National Transport", shortName: "NTC" },
  OP_2: { name: "Rose Hill Transport", shortName: "RHT" },
  OP_3: { name: "United Bus Service", shortName: "UBS" },
  OP_4: { name: "Mauritius Bus Transport", shortName: "MBT" },
  OP_5: { name: "Triolet Bus Service", shortName: "TBS" },
  OP_6: { name: "Express Transport", shortName: "ETS" },
  OP_7: { name: "Curepipe Transport", shortName: "CTC" },
};

export function getOperatorName(operatorId?: string | null): string {
  if (!operatorId) return "Operator";
  return OPERATORS[operatorId]?.name ?? "Operator";
}

export function getOperatorShortName(operatorId?: string | null): string {
  if (!operatorId) return "OP";
  return OPERATORS[operatorId]?.shortName ?? "OP";
}
