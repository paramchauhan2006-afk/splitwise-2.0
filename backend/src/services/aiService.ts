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

export interface ScannedBill {
  items: Array<{
    description: string;
    quantity: number;
    unitPricePaise: number;
    totalPricePaise: number;
  }>;
  subtotalPaise: number;
  taxPaise: number;
  discountPaise: number;
  grandTotalPaise: number;
  vendor: string | null;
  confidence: number;
}

interface GeminiBillResponse {
  vendor: string | null;
  items: Array<{
    description: string;
    quantity: number;
    unitPriceRupees: number;
    totalPriceRupees: number;
  }>;
  subtotalRupees: number;
  taxRupees: number;
  discountRupees: number;
  grandTotalRupees: number;
  confidence: number;
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

export async function scanBillFromImage(
  imageBase64: string,
  mimeType: string
): Promise<ScannedBill> {
  const prompt = `You are a bill scanning assistant for a bill-splitting app.
Extract bill/receipt information from this image and respond with ONLY 
a JSON object — no markdown, no explanation, just raw JSON.

Respond with exactly this JSON structure:
{
  "vendor": "restaurant or shop name or null",
  "items": [
    {
      "description": "item name",
      "quantity": 1,
      "unitPriceRupees": 0.00,
      "totalPriceRupees": 0.00
    }
  ],
  "subtotalRupees": 0.00,
  "taxRupees": 0.00,
  "discountRupees": 0.00,
  "grandTotalRupees": 0.00,
  "confidence": 0.0
}

Rules:
- Extract ALL line items from the bill with their quantities and prices
- subtotalRupees: sum of all items before tax/discount
- taxRupees: any tax, GST, service charge, or similar
- discountRupees: any discount applied (as positive number)
- grandTotalRupees: final total amount to pay
- confidence: your confidence from 0.0 to 1.0 in the extraction accuracy
- If a field is not present on the bill, use 0 or null
- All prices must be decimal numbers (e.g. 150.50)`;

  try {
    const response = await gemini.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: imageBase64,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
    });

    const responseText = response.text ?? '';

    let geminiBillResponse: GeminiBillResponse;
    try {
      const cleanedText = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      geminiBillResponse = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return {
        items: [],
        subtotalPaise: 0,
        taxPaise: 0,
        discountPaise: 0,
        grandTotalPaise: 0,
        vendor: null,
        confidence: 0.2,
      };
    }

    // Convert all rupee values to paise
    const items = geminiBillResponse.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPricePaise: Math.floor(item.unitPriceRupees * 100),
      totalPricePaise: Math.floor(item.totalPriceRupees * 100),
    }));

    return {
      items,
      subtotalPaise: Math.floor(geminiBillResponse.subtotalRupees * 100),
      taxPaise: Math.floor(geminiBillResponse.taxRupees * 100),
      discountPaise: Math.floor(geminiBillResponse.discountRupees * 100),
      grandTotalPaise: Math.floor(geminiBillResponse.grandTotalRupees * 100),
      vendor: geminiBillResponse.vendor,
      confidence: geminiBillResponse.confidence,
    };
  } catch (error) {
    console.error('Bill scanning error:', error);
    return {
      items: [],
      subtotalPaise: 0,
      taxPaise: 0,
      discountPaise: 0,
      grandTotalPaise: 0,
      vendor: null,
      confidence: 0.2,
    };
  }
}
