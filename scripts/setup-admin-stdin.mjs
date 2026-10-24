import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function readPassword() {
    const chunks = [];
    for await (const chunk of process.stdin) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
}

async function main() {
    const email = process.argv[2]?.trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new Error("A valid administrator email is required.");
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        await prisma.user.update({
            where: { email },
            data: { role: "SUPERADMIN" }
        });
        console.log(`Administrator access enabled for ${email}. The existing password was not changed.`);
        return;
    }

    const password = await readPassword();
    const passwordBytes = Buffer.byteLength(password, "utf8");
    if (passwordBytes < 12 || passwordBytes > 72) {
        throw new Error("New administrator passwords must contain 12 to 72 UTF-8 bytes.");
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.create({
        data: {
            email,
            name: "Super Admin",
            password: hashedPassword,
            role: "SUPERADMIN"
        }
    });
    console.log(`Super administrator ${email} created successfully.`);
}

main()
    .catch(error => {
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
