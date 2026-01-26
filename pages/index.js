import { createClient } from '@supabase/supabase-js'
import { useState, useEffect } from 'react'
import { Heart, Gift, TrendingUp, History, Award, X, LogOut, Users, Copy, Check } from 'lucide-react'

const supabase = createClient(
  'https://ccxokhurmylvtgrnbnkp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeG9raHVybXlsdnRncm5ibmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNDY5MDcsImV4cCI6MjA4NDYyMjkwN30.ZpabtXnlIQ3bsZ7p7MIeerDY2EEz8TIQwTe10lDcjVI'
)
export default function Home() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-2xl text-purple-600">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <AuthView />
  }

  return <MainApp user={user} onSignOut={() => supabase.auth.signOut()} />
}
function AuthView() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error: signUpError } = await supabase.auth.signUp({ email, password })
        if (signUpError) throw signUpError
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
      }
    } catch (error) {
      setError(error.message)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
          Lovebux
        </h1>
        <p className="text-center text-gray-600 mb-8">Your relationship&apos;s currency 💕</p>

        {error && <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border rounded-lg"
              minLength={6}
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg font-semibold"
          >
            {mode === 'login' ? 'Sign In' : 'Sign Up'}
          </button>
        </div>

        <button
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="w-full mt-4 text-purple-600 font-medium"
        >
          {mode === 'login' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}
function MainApp({ user, onSignOut }) {
  const [couple, setCouple] = useState(null)
  const [balances, setBalances] = useState({})
  const [transactions, setTransactions] = useState([])
  const [rewards, setRewards] = useState([])
  const [tab, setTab] = useState('rewards')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [showAllRewards, setShowAllRewards] = useState(false)
  const [showGiveModal, setShowGiveModal] = useState(false)
  const [showRewardModal, setShowRewardModal] = useState(false)
  const [showBetModal, setShowBetModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  useEffect(() => {
    loadData()
    const pollInterval = setInterval(loadData, 2000)
    
    const channel = supabase
      .channel('lovebux-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'balances' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rewards' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'couples' }, loadData)
      .subscribe()
  
    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [user.id])

  const loadData = async () => {
    const { data: coupleData } = await supabase
      .from('couples')
      .select('*')
      .or(`partner1_id.eq.${user.id},partner2_id.eq.${user.id}`)
      .single()

    if (coupleData) {
      setCouple(coupleData)

      const { data: bal } = await supabase
        .from('balances')
        .select('*')
        .eq('couple_id', coupleData.id)

      const balMap = {}
      bal?.forEach(b => balMap[b.user_id] = b.balance)
      setBalances(balMap)

      const { data: txs } = await supabase
        .from('transactions')
        .select('*')
        .eq('couple_id', coupleData.id)
        .order('created_at', { ascending: false })

      setTransactions(txs || [])

      const { data: rwd } = await supabase
        .from('rewards')
        .select('*')
        .eq('couple_id', coupleData.id)

      setRewards(rwd || [])
    } else {
      setCouple(null)
    }
  }

  const giveLovebux = async (amount, reason) => {
    const partnerId = user.id === couple.partner1_id ? couple.partner2_id : couple.partner1_id
    const newBalance = (balances[partnerId] || 0) + amount

    await supabase
      .from('balances')
      .update({ balance: newBalance })
      .eq('couple_id', couple.id)
      .eq('user_id', partnerId)

    await supabase.from('transactions').insert({
      couple_id: couple.id,
      from_user_id: user.id,
      to_user_id: partnerId,
      amount,
      reason,
      type: 'gift',
      balance_after: newBalance
    })
  }

  const redeemReward = async (rewardId) => {
    const reward = rewards.find(r => r.id === rewardId)
    const myBalance = balances[user.id] || 0

    if (myBalance >= reward.cost) {
      await supabase
        .from('balances')
        .update({ balance: myBalance - reward.cost })
        .eq('couple_id', couple.id)
        .eq('user_id', user.id)

      await supabase.from('transactions').insert({
        couple_id: couple.id,
        from_user_id: user.id,
        to_user_id: null,
        amount: -reward.cost,
        reason: `Redeemed: ${reward.name}`,
        type: 'redemption',
        balance_after: myBalance - reward.cost
      })

      alert(`You redeemed ${reward.name}! 🎉`)
    }
  }

  const createBet = async (amount, description, winnerId) => {
    const loserId = winnerId === couple.partner1_id ? couple.partner2_id : couple.partner1_id
    const loserBalance = balances[loserId] || 0
    const winnerBalance = balances[winnerId] || 0

    if (loserBalance >= amount) {
      await supabase
        .from('balances')
        .update({ balance: loserBalance - amount })
        .eq('couple_id', couple.id)
        .eq('user_id', loserId)

      await supabase
        .from('balances')
        .update({ balance: winnerBalance + amount })
        .eq('couple_id', couple.id)
        .eq('user_id', winnerId)

      await supabase.from('transactions').insert({
        couple_id: couple.id,
        from_user_id: loserId,
        to_user_id: winnerId,
        amount,
        reason: `Bet: ${description}`,
        type: 'bet',
        balance_after: winnerBalance + amount,
        loser_balance_after: loserBalance - amount
      })
    }
  }

  const updatePartnerName = async (isPartner1, newName) => {
    const field = isPartner1 ? 'partner1_name' : 'partner2_name'
    await supabase
      .from('couples')
      .update({ [field]: newName })
      .eq('id', couple.id)
  }
    if (!couple) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              Lovebux
            </h1>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowSettingsModal(true)} 
                className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
              >
                <Users size={20} />
                Settings
              </button>
              <button onClick={onSignOut} className="text-gray-600 hover:text-gray-800 flex items-center gap-2">
                <LogOut size={20} />
                Sign Out
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
            <Heart className="mx-auto mb-4 text-pink-500" size={64} />
            <h2 className="text-2xl font-bold mb-4">Welcome to Lovebux!</h2>
            <p className="text-gray-600 mb-6">You&apos;re not in a relationship yet. Click Settings to create or join one.</p>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 px-8 rounded-lg font-semibold"
            >
              Get Started
            </button>
          </div>

          {showSettingsModal && <SettingsModal user={user} couple={couple} onClose={() => setShowSettingsModal(false)} />}
        </div>
      </div>
    )
  }

  const myBalance = balances[user.id] || 0
  const partnerId = user.id === couple.partner1_id ? couple.partner2_id : couple.partner1_id
  const partnerBalance = balances[partnerId] || 0
  const myName = user.id === couple.partner1_id ? couple.partner1_name : couple.partner2_name
  const partnerName = user.id === couple.partner1_id ? couple.partner2_name : couple.partner1_name
  const isPartner1 = user.id === couple.partner1_id

  const categories = ['All', 'Quality Time', 'Food', 'Entertainment', 'Misc', 'Fun']
  const filteredRewards = selectedCategory === 'All' 
    ? rewards 
    : rewards.filter(r => r.category === selectedCategory)
  
  const displayedRewards = selectedCategory === 'All' && !showAllRewards
    ? filteredRewards.slice(0, 5)
    : filteredRewards
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            Lovebux
          </h1>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowSettingsModal(true)} 
              className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
            >
              <Users size={20} />
              Settings
            </button>
            <button onClick={onSignOut} className="text-gray-600 hover:text-gray-800 flex items-center gap-2">
              <LogOut size={20} />
              Sign Out
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-200">
            <div className="text-2xl font-bold text-gray-800 mb-2">
              {myName || 'Your Name'}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-4xl font-bold text-pink-500">{myBalance}</span>
              <Heart className="text-pink-400" size={32} />
            </div>
            <p className="text-sm text-gray-500 mt-2">Lovebux</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-purple-200">
            <div className="text-2xl font-bold text-gray-800 mb-2">{partnerName || 'Partner'}</div>
            <div className="flex items-center justify-between">
              <span className="text-4xl font-bold text-purple-500">{partnerBalance}</span>
              <Heart className="text-purple-400" size={32} />
            </div>
            <p className="text-sm text-gray-500 mt-2">Lovebux</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            onClick={() => setShowGiveModal(true)}
            className="bg-pink-500 text-white py-4 rounded-xl font-semibold hover:bg-pink-600 transition flex items-center justify-center gap-2"
          >
            <Heart size={20} />
            Give
          </button>
          <button
            onClick={() => setShowBetModal(true)}
            className="bg-blue-500 text-white py-4 rounded-xl font-semibold hover:bg-blue-600 transition flex items-center justify-center gap-2"
          >
            <TrendingUp size={20} />
            Bet
          </button>
          <button
            onClick={() => setShowRewardModal(true)}
            className="bg-purple-500 text-white py-4 rounded-xl font-semibold hover:bg-purple-600 transition flex items-center justify-center gap-2"
          >
            <Gift size={20} />
            Add Reward
          </button>
        </div>

        <div className="bg-white rounded-t-2xl shadow-lg">
          <div className="flex border-b">
            <button
              onClick={() => setTab('rewards')}
              className={`flex-1 py-4 font-semibold transition ${tab === 'rewards' ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-400'}`}
            >
              <Gift className="inline mr-2" size={20} />
              Rewards
            </button>
            <button
              onClick={() => setTab('history')}
              className={`flex-1 py-4 font-semibold transition ${tab === 'history' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-400'}`}
            >
              <History className="inline mr-2" size={20} />
              History
            </button>
          </div>

          <div className="p-6">
            {tab === 'rewards' && (
              <div>
                <div className="flex gap-2 mb-4 flex-wrap">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat)
                        setShowAllRewards(false)
                      }}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                        selectedCategory === cat
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  {displayedRewards.map(reward => (
                    <div key={reward.id} className="border rounded-xl p-4 hover:shadow-md transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg text-gray-800">{reward.name}</h3>
                            <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
                              {reward.category}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">{reward.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Award className="text-yellow-500" size={16} />
                            <span className="font-semibold text-purple-600">{reward.cost} Lovebux</span>
                          </div>
                        </div>
                        <button
                          onClick={() => redeemReward(reward.id)}
                          disabled={myBalance < reward.cost}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ml-4 ${
                            myBalance >= reward.cost
                              ? 'bg-pink-100 text-pink-600 hover:bg-pink-200'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          Redeem
                        </button>
                      </div>
                    </div>
                  ))}

                  {selectedCategory === 'All' && !showAllRewards && filteredRewards.length > 5 && (
                    <button
                      onClick={() => setShowAllRewards(true)}
                      className="w-full py-3 border-2 border-dashed border-purple-300 rounded-xl text-purple-600 font-semibold hover:bg-purple-50 transition"
                    >
                      Load More Rewards ({filteredRewards.length - 5} more)
                    </button>
                  )}
                </div>
              </div>
            )}

            {tab === 'history' && (
              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">No transactions yet. Start giving Lovebux!</p>
                ) : (
                  transactions.slice(0, 20).map(tx => {
                    const getNameById = (id) => {
                      if (id === couple.partner1_id) return couple.partner1_name || 'Partner 1'
                      if (id === couple.partner2_id) return couple.partner2_name || 'Partner 2'
                      return 'Unknown'
                    }

                    return (
                      <div key={tx.id} className="border-l-4 border-pink-400 pl-4 py-2">
                        <p className="font-semibold text-gray-800">{tx.reason}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString()}
                        </p>
                        {tx.type === 'bet' ? (
                          <div className="mt-1 space-y-1">
                            <p className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">{getNameById(tx.to_user_id)}:</span>
                              <span className="font-bold text-green-600">+{tx.amount}</span>
                              {tx.balance_after != null && (
                                <span className="text-xs text-gray-400">→ {tx.balance_after}</span>
                              )}
                            </p>
                            <p className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">{getNameById(tx.from_user_id)}:</span>
                              <span className="font-bold text-red-600">-{tx.amount}</span>
                              {tx.loser_balance_after != null && (
                                <span className="text-xs text-gray-400">→ {tx.loser_balance_after}</span>
                              )}
                            </p>
                          </div>
                        ) : tx.type === 'gift' ? (
                          <p className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">{getNameById(tx.to_user_id)}:</span>
                            <span className="font-bold text-green-600">+{tx.amount}</span>
                            {tx.balance_after != null && (
                              <span className="text-xs text-gray-400">→ {tx.balance_after}</span>
                            )}
                          </p>
                        ) : tx.type === 'redemption' ? (
                          <p className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">{getNameById(tx.from_user_id)}:</span>
                            <span className="font-bold text-red-600">{tx.amount}</span>
                            {tx.balance_after != null && (
                              <span className="text-xs text-gray-400">→ {tx.balance_after}</span>
                            )}
                          </p>
                        ) : (
                          <p className="flex items-center gap-2">
                            <span className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {tx.amount > 0 ? '+' : ''}{tx.amount}
                            </span>
                            {tx.balance_after != null && (
                              <span className="text-xs text-gray-400">
                                → {tx.balance_after}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showGiveModal && <GiveModal onClose={() => setShowGiveModal(false)} onGive={giveLovebux} />}
      {showRewardModal && <RewardModal onClose={() => setShowRewardModal(false)} coupleId={couple.id} />}
      {showBetModal && <BetModal onClose={() => setShowBetModal(false)} onBet={createBet} couple={couple} />}
      {showSettingsModal && <SettingsModal user={user} couple={couple} onClose={() => setShowSettingsModal(false)} />}
    </div>
  )
}
function GiveModal({ onClose, onGive }) {
  const [amount, setAmount] = useState(10)
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-pink-600">Give Lovebux</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full p-2 border rounded-lg"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Made dinner, did dishes, etc."
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <button
            onClick={() => {
              if (reason.trim()) {
                onGive(amount, reason)
                onClose()
              }
            }}
            className="w-full bg-pink-500 text-white py-3 rounded-lg font-semibold hover:bg-pink-600 transition"
          >
            Give Lovebux ❤️
          </button>
        </div>
      </div>
    </div>
  )
}
function RewardModal({ onClose, coupleId }) {
  const [name, setName] = useState('')
  const [cost, setCost] = useState(20)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Personal')

  const handleCreate = async () => {
    if (name.trim()) {
      await supabase.from('rewards').insert({
        couple_id: coupleId,
        name,
        cost,
        description,
        category
      })
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-purple-600">Create Reward</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Reward Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Back massage, cook favorite meal..."
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 border rounded-lg"
            >
              <option value="Quality Time">Quality Time</option>
              <option value="Food">Food</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Misc">Misc</option>
              <option value="Fun">Fun</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Cost (Lovebux)</label>
            <input
              type="number"
              value={cost}
              onChange={(e) => setCost(Number(e.target.value))}
              className="w-full p-2 border rounded-lg"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <button
            onClick={handleCreate}
            className="w-full bg-purple-500 text-white py-3 rounded-lg font-semibold hover:bg-purple-600 transition"
          >
            Create Reward
          </button>
        </div>
      </div>
    </div>
  )
}
function BetModal({ onClose, onBet, couple }) {
  const [amount, setAmount] = useState(10)
  const [description, setDescription] = useState('')
  const [winner, setWinner] = useState(couple.partner1_id)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-blue-600">Settle a Bet</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Bet Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Who can do more pushups..."
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full p-2 border rounded-lg"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Winner</label>
            <select
              value={winner}
              onChange={(e) => setWinner(e.target.value)}
              className="w-full p-2 border rounded-lg"
            >
              <option value={couple.partner1_id}>{couple.partner1_name || 'Partner 1'}</option>
              <option value={couple.partner2_id}>{couple.partner2_name || 'Partner 2'}</option>
            </select>
          </div>

          <button
            onClick={() => {
              if (description.trim()) {
                onBet(amount, description, winner)
                onClose()
              }
            }}
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition"
          >
            Settle Bet
          </button>
        </div>
      </div>
    </div>
  )
}
function SettingsModal({ user, couple, onClose }) {
  const [showCreateMode, setShowCreateMode] = useState(false)
  const [showJoinMode, setShowJoinMode] = useState(false)
  const [createName, setCreateName] = useState('')
  const [joinName, setJoinName] = useState('')
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [editName, setEditName] = useState('')
  const [showEditName, setShowEditName] = useState(false)

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase()

  const createCouple = async () => {
    if (!createName.trim()) {
      alert('Please enter your name')
      return
    }

    try {
      // Clean up old unpaired relationships
      const { data: oldCouples } = await supabase
        .from('couples')
        .select('*')
        .eq('partner1_id', user.id)
        .is('partner2_id', null)

      if (oldCouples && oldCouples.length > 0) {
        for (const oldCouple of oldCouples) {
          await supabase.from('balances').delete().eq('couple_id', oldCouple.id)
          await supabase.from('rewards').delete().eq('couple_id', oldCouple.id)
          await supabase.from('transactions').delete().eq('couple_id', oldCouple.id)
          await supabase.from('couples').delete().eq('id', oldCouple.id)
        }
      }

      const newCode = generateCode()
      const { data, error } = await supabase
        .from('couples')
        .insert({
          partner1_id: user.id,
          partner1_name: createName.trim(),
          pairing_code: newCode
        })
        .select()
        .single()

      if (error) throw error

      await supabase.from('balances').insert({
        couple_id: data.id,
        user_id: user.id,
        balance: 100
      })

      const defaultRewards = [
        // Quality Time
        { name: 'Date Night Choice', cost: 30, description: 'Pick the next date activity', category: 'Quality Time' },
        { name: 'Netflix & Chill', cost: 20, description: 'Take some time to relax with me', category: 'Quality Time' },
        { name: 'Phone-Free Hour', cost: 20, description: 'No phones for the next hour', category: 'Quality Time' },
        
        // Food & Treats
        { name: 'Choose Next Meal Out', cost: 20, description: 'Pick the restaurant', category: 'Food' },
        { name: 'Breakfast in Bed', cost: 30, description: 'Get breakfast made and served', category: 'Food' },
        { name: 'Cook Favorite Meal', cost: 40, description: 'Partner makes your favorite dish', category: 'Food' },
        { name: 'Sweet Treat', cost: 20, description: 'Sweet treat, please!', category: 'Food' },
        
        // Entertainment
        { name: 'Movie/TV Show Control', cost: 20, description: 'Control what you watch tonight', category: 'Entertainment' },
        { name: 'Game Night Choice', cost: 20, description: 'Choose the game you play', category: 'Entertainment' },
        { name: 'Hobby Participation', cost: 40, description: 'Partner joins your hobby for an hour', category: 'Entertainment' },
        
        // Miscellaneous
        { name: 'Choose the Music', cost: 15, description: 'Control the playlist today', category: 'Misc' },
        { name: 'Backrub/Massage', cost: 30, description: '15-minute massage', category: 'Misc' },
        { name: 'Errand Run', cost: 25, description: 'Partner handles an errand for you', category: 'Misc' },
        
        // Fun
        { name: 'Outfit Selection', cost: 20, description: 'I get to pick your outfit today', category: 'Fun' },
        { name: 'Silly Dare', cost: 25, description: 'Partner does a silly challenge of your choice', category: 'Fun' },
        { name: 'Photo Shoot', cost: 30, description: 'Partner models for your photos/videos', category: 'Fun' }
      ]

      for (const reward of defaultRewards) {
        await supabase.from('rewards').insert({
          couple_id: data.id,
          ...reward
        })
      }

      onClose()
      alert(`Relationship created! Code: ${newCode}`)
      window.location.href = window.location.href

    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  const joinCouple = async () => {
    if (!joinName.trim()) {
      alert('Please enter your name')
      return
    }

    if (!code || code.length !== 6) {
      alert('Please enter a valid 6-character code')
      return
    }

    try {
      const upperCode = code.toUpperCase().trim()

      const { data: existingRelationship } = await supabase
        .from('couples')
        .select('*')
        .or(`partner1_id.eq.${user.id},partner2_id.eq.${user.id}`)

      if (existingRelationship && existingRelationship.length > 0) {
        alert('You are already in a relationship. Unlink first.')
        return
      }

      const { data: couples, error: fetchError } = await supabase
        .from('couples')
        .select('*')
        .eq('pairing_code', upperCode)

      if (fetchError || !couples || couples.length === 0) {
        alert('Invalid pairing code!')
        return
      }

      const targetCouple = couples[0]

      if (targetCouple.partner2_id !== null) {
        alert('Relationship already has both partners!')
        return
      }

      if (targetCouple.partner1_id === user.id) {
        alert('Cannot join your own relationship!')
        return
      }

      const { error: updateError } = await supabase
        .from('couples')
        .update({
          partner2_id: user.id,
          partner2_name: joinName.trim()
        })
        .eq('id', targetCouple.id)

      if (updateError) throw updateError

      await supabase.from('balances').insert({
        couple_id: targetCouple.id,
        user_id: user.id,
        balance: 100
      })

      onClose()
      alert('Successfully joined!')
      window.location.href = window.location.href

    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  const unlinkRelationship = async () => {
    if (!confirm('Are you sure you want to unlink from this relationship? This cannot be undone.')) {
      return
    }

    try {
      const isPartner1 = user.id === couple.partner1_id

      await supabase
        .from('balances')
        .delete()
        .eq('couple_id', couple.id)
        .eq('user_id', user.id)

      if (isPartner1) {
        if (couple.partner2_id) {
          await supabase
            .from('couples')
            .update({
              partner1_id: couple.partner2_id,
              partner1_name: couple.partner2_name,
              partner2_id: null,
              partner2_name: null
            })
            .eq('id', couple.id)
        } else {
          await supabase.from('transactions').delete().eq('couple_id', couple.id)
          await supabase.from('rewards').delete().eq('couple_id', couple.id)
          await supabase.from('balances').delete().eq('couple_id', couple.id)
          await supabase.from('couples').delete().eq('id', couple.id)
        }
      } else {
        await supabase
          .from('couples')
          .update({
            partner2_id: null,
            partner2_name: null
          })
          .eq('id', couple.id)
      }

      onClose()
      alert('Successfully unlinked')
      window.location.href = window.location.href

    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const updateMyName = async (newName) => {
    if (!newName.trim()) {
      alert('Please enter a name')
      return
    }
  
    try {
      const isPartner1 = user.id === couple.partner1_id
      const field = isPartner1 ? 'partner1_name' : 'partner2_name'
      
      await supabase
        .from('couples')
        .update({ [field]: newName.trim() })
        .eq('id', couple.id)
  
      alert('Name updated!')
      window.location.href = window.location.href
    } catch (error) {
      alert('Error updating name: ' + error.message)
    }
  }
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-purple-600">Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {couple && !showCreateMode && !showJoinMode && !showEditName && (
          <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Current Relationship</h4>
              <p className="text-sm text-gray-600">
                {couple.partner1_name} & {couple.partner2_name || '(Waiting for partner)'}
              </p>
              {couple.pairing_code && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-1">Pairing Code:</p>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold text-purple-600">{couple.pairing_code}</span>
                    <button
                      onClick={() => copyToClipboard(couple.pairing_code)}
                      className="p-1 hover:bg-purple-100 rounded"
                    >
                      {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-purple-600" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
        
            <button
              onClick={() => {
                const myName = user.id === couple.partner1_id ? couple.partner1_name : couple.partner2_name
                setEditName(myName || '')
                setShowEditName(true)
              }}
              className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600"
            >
              Change My Name
            </button>
        
            <button
              onClick={unlinkRelationship}
              className="w-full bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600"
            >
              Unlink from Relationship
            </button>
          </div>
        )}
        
        {showEditName && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Your Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full p-3 border rounded-lg"
                placeholder="Enter your name"
              />
            </div>
            <button
              onClick={() => updateMyName(editName)}
              disabled={!editName.trim()}
              className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-300"
            >
              Update Name
            </button>
            <button
              onClick={() => setShowEditName(false)}
              className="w-full text-gray-600 py-2"
            >
              Back
            </button>
          </div>
        )}

        {!couple && !showCreateMode && !showJoinMode && (
          <div className="space-y-4">
            <p className="text-gray-600 text-center mb-4">You&apos;re not in a relationship yet</p>
            <button
              onClick={() => setShowCreateMode(true)}
              className="w-full bg-pink-500 text-white py-3 rounded-lg font-semibold hover:bg-pink-600"
            >
              Create New Relationship
            </button>
            <button
              onClick={() => setShowJoinMode(true)}
              className="w-full bg-purple-500 text-white py-3 rounded-lg font-semibold hover:bg-purple-600"
            >
              Join Existing Relationship
            </button>
          </div>
        )}

        {showCreateMode && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Your Name</label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className="w-full p-3 border rounded-lg"
                placeholder="Enter your name"
              />
            </div>
            <button
              onClick={createCouple}
              disabled={!createName.trim()}
              className="w-full bg-pink-500 text-white py-3 rounded-lg font-semibold hover:bg-pink-600 disabled:bg-gray-300"
            >
              Create Relationship
            </button>
            <button
              onClick={() => setShowCreateMode(false)}
              className="w-full text-gray-600 py-2"
            >
              Back
            </button>
          </div>
        )}

        {showJoinMode && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Your Name</label>
              <input
                type="text"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                className="w-full p-3 border rounded-lg"
                placeholder="Enter your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Pairing Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full p-3 border rounded-lg uppercase"
                placeholder="XXXXXX"
                maxLength={6}
              />
            </div>
            <button
              onClick={joinCouple}
              disabled={!joinName.trim() || code.length !== 6}
              className="w-full bg-purple-500 text-white py-3 rounded-lg font-semibold hover:bg-purple-600 disabled:bg-gray-300"
            >
              Join Relationship
            </button>
            <button
              onClick={() => setShowJoinMode(false)}
              className="w-full text-gray-600 py-2"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
