import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { major, academicResults, location } = body;

    if (!major || !academicResults || !location) {
      return NextResponse.json(
        { error: "Please provide major, academic results, and location" },
        { status: 400 }
      );
    }

    const systemPrompt = `As a college admissions expert, generate a list of 10 universities based on the following criteria:

Student Profile:
- Intended Major: ${major}
- Academic Profile: ${academicResults}
- Preferred Location: ${location}

Requirements:
1. Generate exactly 10 universities divided as follows:
   - 3 Reach universities (more competitive, acceptance rate typically 10-20% lower than student's profile)
   - 3 Target universities (matches student's profile)
   - 4 Safety universities (less competitive, acceptance rate typically 10-20% higher than student's profile)

2. For each university, provide:
   - Full university name
   - Classification (Reach/Target/Safety)
   - Application deadlines (include both Early Decision/Action and Regular Decision if applicable)
   - Academic requirements (GPA, test scores, etc.)
   - Direct application portal URL
   - Scholarship opportunities URL

Format the response as a JSON object with a "universities" array containing exactly 10 objects with this structure:
{
  "universities": [
    {
      "name": "University Name",
      "level": "Reach/Target/Safety",
      "deadline": "Specific deadline dates",
      "requirements": "Detailed academic requirements",
      "applicationLink": "Direct application URL",
      "scholarshipLink": "Scholarship page URL"
    },
    ...
  ]
}

Ensure all information is accurate and up-to-date. Include real URLs for application portals and scholarship pages.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      return NextResponse.json(
        { error: "Failed to generate college list" },
        { status: 500 }
      );
    }

    try {
      const parsedResponse = JSON.parse(response);
      
      // Validate the response structure
      if (!Array.isArray(parsedResponse.universities) || parsedResponse.universities.length !== 10) {
        throw new Error("Invalid response format: Expected 10 universities");
      }

      // Count universities by level
      const counts = {
        Reach: 0,
        Target: 0,
        Safety: 0,
      };

      // Validate each university object and count levels
      parsedResponse.universities.forEach((university: any) => {
        if (!university.name || !university.level || !university.deadline || 
            !university.requirements || !university.applicationLink || !university.scholarshipLink) {
          throw new Error("Invalid university data format");
        }
        counts[university.level as keyof typeof counts]++;
      });

      // Verify the correct distribution of university levels
      if (counts.Reach !== 3 || counts.Target !== 3 || counts.Safety !== 4) {
        throw new Error("Invalid distribution of university levels");
      }

      return NextResponse.json(parsedResponse);
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      return NextResponse.json(
        { error: "Failed to process college list" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error generating college list:", error);
    return NextResponse.json(
      { error: "Failed to generate college list" },
      { status: 500 }
    );
  }
} 