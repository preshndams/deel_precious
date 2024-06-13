const supertest = require("supertest");
const app = require("./app");
let request;
let server;

beforeAll(async () => {
    request = supertest(app);
    server = app.listen()
});

afterAll(async () => {
    server.close();
});

describe("===== Contract ==========", () => {
    it("check if api request was successful", async () => {
        const response = await request
            .get(`/contracts`)
            .set("Accept", "application/json")
            .expect("Content-Type", /json/)
        const { success } = response.body;

        expect(success).toBe(true);
    });

    it("check if contracts are listed", async () => {
        const response = await request
            .get(`/contracts`)
            .set("Accept", "application/json")
            .expect("Content-Type", /json/)
        const { data } = response.body;
        expect(data).toBeDefined()
    });

    it("expects 403 status error false when checking contract without profile_id on req.headers", async () => {
        const response = await request
            .get(`/contracts/2`)
            .set("Accept", "application/json")

        expect(response.status).toBe(403);
    });

    it("expects 401 status code when accessing a contract that doesn't belong to client or contractor id", async () => {
        const response = await request
            .get(`/contracts/2`)
            .set({ "Accept": "application/json", "profile_id": 2 })
            .expect(401)

    });

    it("expects 404 status code when accessing a non-existing contract id", async () => {
        const response = await request
            .get(`/contracts/59`)
            .set({ "Accept": "application/json", "profile_id": 8 })
            .expect(404)

    });

    it("expects 200 status code when accessing a contract by a valid client or contractor", async () => {
        const response = await request
            .get(`/contracts/5`)
            .set({ "Accept": "application/json", "profile_id": 8 })
            .expect(200)

    });
});


describe("===== Jobs ==========", () => {
    it("expects 200 status code & data to be retrieved when listing unpaid jobs  for client or contractor id", async () => {
        const response = await request
            .get(`/jobs/unpaid`)
            .set({ "Accept": "application/json", "profile_id": 2 })
            .expect(200)

        const { data } = response.body

        expect(data).toBeDefined()

    });

    it("expects 401 status code when unauthorized client tries to make payment", async () => {
        await request
            .post(`/jobs/3/pay`)
            .set({ "Accept": "application/json", "profile_id": 8 })
            .expect(401)

    });

    it("expects 200 status code paying a contractor for a job", async () => {
        await request
            .post(`/jobs/4/pay`)
            .set({ "Accept": "application/json", "profile_id": 2 })
            .expect(200)

    });

    it("expects 409 status code & when paying twice for a job", async () => {
        await request
            .post(`/jobs/4/pay`)
            .set({ "Accept": "application/json", "profile_id": 2 })
            .expect(409)

    });

    it("expects 402 status code for insufficient funds", async () => {
        const response = await request
            .post(`/jobs/3/pay`)
            .set({ "Accept": "application/json", "profile_id": 2 })
            .expect(402)

        expect(response.body.message).toBe('Insufficient funds')

    });
});

describe("===== Balance ==========", () => {
    it("expects 422 status code when making deposit above 25% of job pay", async () => {
        await request
            .post(`/balances/deposit/2`)
            .set({ "Accept": "application/json" })
            .send({ amount: 100 })
            .expect(422)


    });

    it("expects 200 status code when making successful deposit ", async () => {
        await request
            .post(`/balances/deposit/1`)
            .set({ "Accept": "application/json" })
            .send({ amount: 100 })
            .expect(200)


    });
});

describe("===== Admin ==========", () => {
    it("expects 200 status code when fetching best profession", async () => {
        const response = await request
            .get(`/admin/best-profession`)
            .set({ "Accept": "application/json" })
            .query({ start: '2020-06-12', end: '2024-06-12' })
            .expect(200)

        const { success, data } = response.body
        expect(data).toBeDefined()
        expect(success).toBe(true)

    });

    it("expects 200 status code when fetching best client", async () => {
        const response = await request
            .get(`/admin/best-clients`)
            .set({ "Accept": "application/json" })
            .query({ start: '2020-06-12', end: '2024-06-12' })
            .expect(200);

        const { success, data } = response.body
        expect(data).toBeDefined()
        expect(success).toBe(true)

    });

});
