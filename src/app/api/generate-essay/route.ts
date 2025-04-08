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
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { 
      university, 
      wordLimit, 
      prompt,
      questionnaireData,
      userInfo 
    } = await req.json();

<<<<<<< HEAD
    if (!university || !wordLimit || !prompt) {
      return new NextResponse("Missing required fields", { status: 400 });
    }
=======
    // if (!university || !wordLimit || !prompt) {
    //   return new NextResponse("Missing required fields", { status: 400 });
    // }
>>>>>>> parent of 8b0c05d (Personal statement API issue fixed)

    const systemPrompt = `You are a highly skilled college admissions essay writer. Write a supplemental essay for ${university} with a word limit of ${wordLimit} words. The essay should be personal, engaging, and showcase the student's unique qualities.

Student Background:
- Gender: ${userInfo?.gender || 'Not specified'}
- Country: ${userInfo?.country || 'Not specified'}
- Major Interest: ${userInfo?.major || 'Not specified'}
- Academic Background: ${userInfo?.academics || 'Not specified'}

Personal Profile (from questionnaire):
1. Academic Passions:
${questionnaireData?.academicInterests || 'Not provided'}

2. Defining Life Experience:
${questionnaireData?.significantExperience || 'Not provided'}

3. Personal Growth Journey:
${questionnaireData?.personalGrowth || 'Not provided'}

4. Future Aspirations:
${questionnaireData?.futureGoals || 'Not provided'}

5. Challenges & Learning:
${questionnaireData?.challengesOvercome || 'Not provided'}

Essay Requirements:
- University: ${university}
- Word Limit: ${wordLimit} words
- Prompt: ${prompt}

Writing Guidelines:
1. Craft a deeply personal and authentic response that directly addresses the prompt
2. Incorporate relevant details from the student's background and experiences
3. Demonstrate how the student's experiences and aspirations align with ${university}'s values and opportunities
4. Show, don't tell - use specific examples and vivid details
5. Maintain a clear narrative structure with a compelling introduction and conclusion
6. Stay within the ${wordLimit} word limit
7. Ensure the essay reveals the student's character, values, and potential contribution to the university community
8. Connect the student's past experiences with their future goals
9. Use the student's unique cultural and personal background to enrich the narrative
10. Maintain an authentic voice that reflects the student's age and perspective`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: Math.min(wordLimit * 4, 2000), // Approximate tokens needed
    });

    const essay = completion.choices[0].message.content;

    return new NextResponse(JSON.stringify({ essay }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating essay:", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to generate essay" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 