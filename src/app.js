const express = require('express');
const { sequelize } = require('./model')
const { getProfile } = require('./middleware/getProfile');
const { CONTRACT_STATUS } = require('./utils/constant');
const { Sequelize, Op } = require('sequelize');
const { joiValidator } = require('./utils');
const { bestClient } = require('./validation');
const validations = require('./validation');
const app = express();

app.use(express.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)
app.use(express.urlencoded({ extended: true }))

app.get('/contracts/:id', joiValidator(validations.contract), getProfile, async (req, res) => {
  const { Contract } = req.app.get('models')
  const { id } = req.params
  const { id: profileId } = req.profile
  const contract = await Contract.findByPk(id)
  if (!contract) return res.status(404).json("Contract not found")
  if (contract.ClientId !== profileId && contract.ContractorId !== profileId) return res.status(401).json({ message: 'Unauthorized' })
  res.json({
    success: true, data: contract, message: "Contract details"
  })
})

app.get('/contracts', getProfile, async (req, res) => {
  const { Contract } = req.app.get('models')
  const { id: profileId } = req.profile
  const contracts = await Contract.findAll({
    where: {
      [Op.or]: [
        { ContractorId: profileId },
        { ClientId: profileId }
      ],
      status: {
        [Op.ne]: CONTRACT_STATUS.TERMINATED
      }
    }
  })
  res.json({ success: true, data: contracts, message: ' List of contracts retrieved successfully' })
})

app.get('/jobs/unpaid', getProfile, async (req, res) => {
  const { Job, Contract } = req.app.get('models')
  const { id: profileId } = req.profile
  const jobs = await Job.findAll({
    include: [{
      model: Contract,
      where: {
        ContractorId: profileId,
      },
      attributes: []
    }],
    where: {
      paid: false
    }
  })

  res.json({
    success: true,
    data: jobs,
    message: 'All unpaid jobs retrieved successfully'
  })
})

app.post('/jobs/:job_id/pay', joiValidator(validations.pay), getProfile, async (req, res) => {
  return await sequelize.transaction(async (transaction) => {
    const { Job, Contract, Profile } = req.app.get('models')
    const { job_id } = req.params;
    const { id, balance } = req.profile;
    const job = await Job.findByPk(job_id, {
      include: {
        model: Contract,
        attributes: ["ClientId", "ContractorId", "status"]
      },
    })

    if (!job) return res.status(422).json({ message: 'Payment cannot be made for this job' });
    if (job.paid) return res.status(409).json({ message: 'Payment already exist for this job' });

    const amountToPay = job.price
    const clientId = job.Contract.ClientId;
    const contractorId = job.Contract.ContractorId

    if (clientId !== id) return res.status(401).json({ message: 'Oops.. unauthorized client attempting to make payment' });
    if (contractorId === id) return res.status(401).json({ message: 'Invalid operation, contractor cannot pay self' });

    if (balance < amountToPay) return res.status(402).json({ message: 'Insufficient funds' });

    await Promise.all([
      Profile.update({
        balance: Sequelize.literal(`balance - ${amountToPay}`)
      }, { where: { id: clientId } }, transaction),
      Profile.update({
        balance: Sequelize.literal(`balance + ${amountToPay}`)
      }, { where: { id: contractorId } }, transaction), ,
      job.update({ paid: true }, { transaction })
    ])

    res.json({
      success: true,
      data: [],
      message: 'Payment successful'
    })
  })
})

app.post('/balances/deposit/:userId', joiValidator(validations.deposit), async (req, res) => {
  return await sequelize.transaction(async (transaction) => {
    const { Job, Contract, Profile } = req.app.get('models')
    const { userId } = req.params;
    const { amount } = req.body;
    const user = await Profile.findByPk(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })
    const userTotalPay = await Job.sum('price', {
      include: {
        model: Contract,
        where: {
          ClientId: userId,
        },
        attributes: ["ClientId", "ContractorId", "status"]
      },
      where: { paid: false }
    })
    const depositLimit = userTotalPay * 0.25;
    if (amount > depositLimit) return res.status(422).json({ message: 'Cannot deposit more than 25% of jobs to be paid' })
    await user.increment('balance', { by: amount }, { transaction })
    res.json({
      success: true,
      data: [],
      message: 'Deposit successful'
    })
  })
})

app.get('/admin/best-profession', joiValidator(validations.bestProfession), async (req, res) => {
  const { Job, Contract, Profile } = req.app.get('models')
  const { start, end } = req.query;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const result = await Job.findAll({
    attributes: [
      [Sequelize.col('Contract.Contractor.profession'), 'profession'],
      [Sequelize.fn('SUM', Sequelize.col('price')), 'total_price']
    ],
    include: [{
      model: Contract,
      attributes: [],
      include: [{
        model: Profile,
        as: 'Contractor',
        attributes: []
      }]
    }],
    where: {
      paymentDate: {
        [Op.between]: [startDate, endDate]
      },
      paid: true
    },
    group: ['Contract.Contractor.profession'],
    order: [[Sequelize.literal('total_price'), 'DESC']],
    limit: 1,
    raw: true
  });

  res.json({
    success: true,
    data: {
      profession: result[0].profession,
    },
    message: 'Data retrieved successfully'
  })
})

app.get('/admin/best-clients', joiValidator(validations.bestClient), async (req, res) => {
  const { Job, Contract } = req.app.get('models')
  const { start, end, limit } = req.query;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const result = await Job.findAll({
    attributes: [
      [Sequelize.col('Contract.ClientId'), 'client'],
      [Sequelize.fn('SUM', Sequelize.col('price')), 'total_payment']
    ],
    include: [{
      model: Contract,
      attributes: []
    }],
    where: {
      paymentDate: {
        [Op.between]: [startDate, endDate]
      },
      paid: true
    },
    group: ['Contract.ClientId'],
    order: [[Sequelize.literal('total_payment'), 'DESC']],
    limit,
    raw: true
  });

  res.json({
    success: true,
    data: result,
    message: 'Data retrieved successfully'
  })
})

app.use((req, res) => {
  res.status(404).json({
    message: `Requested route (${req.originalUrl} ) not found`,
  });
});

app.use((err, req, res, next) => {
  if (!err) return next();
  res.status(err.httpStatusCode || 500).json({ message: err.message })
});


module.exports = app