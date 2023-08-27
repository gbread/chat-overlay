import dictionaries from "../src/assets/dictionaries.js";

import {modify_words} from "../src/lib/tts.js";

import {describe, expect, test, it} from "vitest";


describe("modifying words", () => {
    const dictionary = dictionaries["cs-cz"];
    const link_text = "odkaz";

    test("allows empty message", () => {
        expect(modify_words("", link_text, dictionary)).toBe("");
    });

    test("works without dictionary", () => {
        expect(modify_words("", link_text)).toBe("");
    });

    test("works without link_text", () => {
        expect(modify_words("")).toBe("");
    });

    test("replaced link with link_text", () => {
        expect(modify_words("https://www.google.com/", link_text)).toBe(link_text);
    });

    test("replaced 2 links with link_text", () => {
        expect(modify_words("https://www.google.com/ https://www.google.com/", link_text)).toBe(`${link_text} ${link_text}`);
    });

    test("replaced underscores with spaces", () => {
        expect(modify_words("co_to")).toBe("co to");
    });

    describe("emojis", () => {
        test("removed emojis", () => {
            expect(modify_words("co😎to")).toBe("coto");
        });

        test("removed all emojis", () => {
            expect(modify_words("😎👍🤷‍♂️")).toBe("");
        });
    });

    describe("space after", () => {
        test("space after ?", () => {
            expect(modify_words("co?to")).toBe("co? to");
        });

        test("space after many ?", () => {
            expect(modify_words("co???to")).toBe("co??? to");
        });

        test("space after !", () => {
            expect(modify_words("co!to")).toBe("co! to");
        });

        test("space after many !", () => {
            expect(modify_words("co!!!to")).toBe("co!!! to");
        });

        test("space after .", () => {
            expect(modify_words("co.to")).toBe("co. to");
        });

        test("space after many .", () => {
            expect(modify_words("co...to")).toBe("co... to");
        });

        test("space after ,", () => {
            expect(modify_words("co,to")).toBe("co, to");
        });

        test("space after many ,", () => {
            expect(modify_words("co,,,to")).toBe("co,,, to");
        });
    });

    describe("space before and after", () => {
        test("space before and after integer", () => {
            expect(modify_words("co5to")).toBe("co 5 to");
        });

        test("space before and after negative integer", () => {
            expect(modify_words("co-5to")).toBe("co -5 to");
        });

        test("space before and after plus integer", () => {
            expect(modify_words("co+5to")).toBe("co +5 to");
        });

        test("space before and after decimal with dot", () => {
            expect(modify_words("co5.1to")).toBe("co 5.1 to");
        });

        test("space before and after decimal with comma", () => {
            expect(modify_words("co5,1to")).toBe("co 5,1 to");
        });
    });

    describe("space before", () => {
        test("space before integer", () => {
            expect(modify_words("route66")).toBe("route 66");
        });

        test("space before decimal", () => {
            expect(modify_words("hell66.6")).toBe("hell 66.6");
        });

        test("space after integer", () => {
            expect(modify_words("7prime")).toBe("7 prime");
        });

        test("space after decimal", () => {
            expect(modify_words("1.0version")).toBe("1.0 version");
        });
    });

    describe("dictionary", () => {
        test("dictionary abbreviation", () => {
            expect(modify_words("atd", link_text, dictionary)).toBe("a tak dále");
        });

        test("dictionary slang", () => {
            expect(modify_words("jj", link_text, dictionary)).toBe("jojo");
        });

        test("dictionary better pronounciation", () => {
            expect(modify_words("vysere", link_text, dictionary)).toBe("vy sere");
        });

        test("dictionary missing accent characters", () => {
            expect(modify_words("afrikac", link_text, dictionary)).toBe("afrikáč");
        });

        describe("dictionary punctuation", () => {
            test("dictionary abbreviation", () => {
                expect(modify_words("atd.", link_text, dictionary)).toBe("a tak dále.");
            });

            test("dictionary slang", () => {
                expect(modify_words("jj,", link_text, dictionary)).toBe("jojo,");
            });

            test("dictionary better pronounciation", () => {
                expect(modify_words("vysere!", link_text, dictionary)).toBe("vy sere!");
            });

            test("dictionary missing accent characters", () => {
                expect(modify_words("afrikac?", link_text, dictionary)).toBe("afrikáč?");
            });
        });
    });
});
