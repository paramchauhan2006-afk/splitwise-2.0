import { gemini } from '../lib/gemini';

interface GroupMember {
  id: string;
  displayName: string;
}

interface GeminiResponse {
  description: string;
  amountRupees: number;
  payerName: string | null;
  participantNames: string[];
  confidence: number;
}

export interface ParsedExpense {
  description: string;
  totalAmountPaise: number;
  splitType: 'EQUAL';
  participantMemberIds: string[];
  suggestedPayerMemberId: string | null;
  confidence: number;
  rawText: string;
}

export async function parseExpenseFromText(
  text: string,
  groupMembers: GroupMember[]
): Promise<ParsedExpense> {
  const prompt = `You are an expense parsing assistant for a bill-splitting app.
Extract expense information from this text and respond with ONLY 
a JSON object ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â no markdown, no explanation, just raw JSON.

Group members available:
${groupMembers.map((m) => `- "${m.displayName}" (id: ${m.id})`).join('\n')}

Text to parse: "${text}"

Respond with exactly this JSON structure:
{
  "description": "brief expense description",
  "amountRupees": 0,
  "payerName": "name of who paid or null if unclear",
  "participantNames": ["name1", "name2"],
  "confidence": 0.0
}

Rules:
- description: short phrase describing the expense (e.g. "Dinner", "Cab")
- amountRupees: the amount as a decimal number (e.g. 900.00)
- payerName: match to one of the group member names above, or null
- participantNames: list of member names who share this expense
- confidence: your confidence from 0.0 to 1.0 that you parsed correctly
- If "me" or "I" appears, it refers to the person who typed the message
  (they are the first member in the list above)
- Only use names from the group members list above`;

  try {
  const response = await gemini.models.generateContent({
    model: 'gemini-3.5-flash-lite',
    contents: prompt,
  });

  const responseText = response.text ?? '';

  let geminiResponse: GeminiResponse;
  try {
    const cleanedText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    geminiResponse = JSON.parse(cleanedText);
  } catch (parseError) {
    return {
      description: text.slice(0, 100),
      totalAmountPaise: 0,
      splitType: 'EQUAL',
      participantMemberIds: groupMembers.map((m) => m.id),
      suggestedPayerMemberId: null,
      confidence: 0.2,
      rawText: text,
    };
  }

    const totalAmountPaise = Math.floor(geminiResponse.amountRupees * 100);

    const findMemberByName = (name: string | null): string | null => {
      if (!name) return null;
      const lowerName = name.toLowerCase();
      const member = groupMembers.find((m) =>
        m.displayName.toLowerCase().includes(lowerName) || lowerName.includes(m.displayName.toLowerCase())
      );
      return member ? member.id : null;
    };

    const suggestedPayerMemberId = findMemberByName(geminiResponse.payerName);

    const participantMemberIds: string[] = [];
    for (const name of geminiResponse.participantNames) {
      const memberId = findMemberByName(name);
      if (memberId && !participantMemberIds.includes(memberId)) {
        participantMemberIds.push(memberId);
      }
    }

    if (participantMemberIds.length === 0) {
      participantMemberIds.push(...groupMembers.map((m) => m.id));
    }

    return {
      description: geminiResponse.description,
      totalAmountPaise,
      splitType: 'EQUAL',
      participantMemberIds,
      suggestedPayerMemberId,
      confidence: geminiResponse.confidence,
      rawText: text,
    };
  } catch (error) {
    console.error('AI parsing error:', error);
    return {
      description: text.slice(0, 100),
      totalAmountPaise: 0,
      splitType: 'EQUAL',
      participantMemberIds: groupMembers.map((m) => m.id),
      suggestedPayerMemberId: null,
      confidence: 0.2,
      rawText: text,
    };
  }
}
