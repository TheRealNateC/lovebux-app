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

  return <MainApp user={user} onSignOut={() => {
    supabase.auth.signOut()
  }} />
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
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: window.location.origin
        }
      })
      if (error) throw error
      // Auto-login after signup
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
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border rounded-lg"
              required
              minLength={6}
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-700"
          >
            {mode === 'login' ? 'Sign In' : 'Sign Up'}
          </button>
        </div>

        <button
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="w-full mt-4 text-purple-600 font-medium hover:text-purple-700"
        >
          {mode === 'login' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}

function SetupView({ user, onComplete, onSignOut }) {
  const [coupleData, setCoupleData] = useState(null)
  const [mode, setMode] = useState(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [pairingCode, setPairingCode] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    checkCouple()
    const interval = setInterval(checkCouple, 3000)
    return () => clearInterval(interval)
  }, [])

  const checkCouple = async () => {
    const { data } = await supabase
      .from('couples')
      .select('*')
      .or(`partner1_id.eq.${user.id},partner2_id.eq.${user.id}`)
      .single()

    if (data) {
      setCoupleData(data)
      if (data.partner1_id && data.partner2_id) {
        onComplete()
      }
    }
  }

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

    // Create new relationship
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
      { name: 'Cuddle Session', cost: 15, description: '30 min mandatory cuddle time', category: 'Romance' },
      { name: 'Date Night Choice', cost: 50, description: 'Pick the next date activity', category: 'Romance' },
      { name: 'That "Special Thing"', cost: 100, description: 'You know what it means 😉', category: 'Romance' },
      { name: 'Dishes Pass', cost: 20, description: 'Skip doing dishes for a day', category: 'Chores' },
      { name: 'Laundry Service', cost: 30, description: 'Partner does your laundry', category: 'Chores' },
      { name: 'Cleaning Help', cost: 40, description: 'Partner cleans a room of your choice', category: 'Chores' },
      { name: 'One Thing', cost: 25, description: 'Partner does one task/errand for you', category: 'Chores' },
      { name: 'Choose Next Meal Out', cost: 30, description: 'Pick the restaurant next time', category: 'Food' },
      { name: "Don't Have to Cook", cost: 35, description: 'Order takeout or partner cooks', category: 'Food' },
      { name: 'Breakfast in Bed', cost: 40, description: 'Get breakfast made and served', category: 'Food' },
      { name: 'Cook Specific Meal', cost: 45, description: 'Partner makes your favorite meal', category: 'Food' },
      { name: 'Movie/TV Show Choice', cost: 20, description: 'Control what you watch tonight', category: 'Entertainment' },
      { name: 'Game Night Pick', cost: 20, description: 'Choose the game you play together', category: 'Entertainment' },
      { name: 'Hobby Participation', cost: 35, description: 'Partner joins your hobby for an hour', category: 'Entertainment' }
    ]

    for (const reward of defaultRewards) {
      await supabase.from('rewards').insert({
        couple_id: data.id,
        ...reward
      })
    }

    onClose()
    alert(`Relationship created! Code: ${newCode}`)
    location.reload(true)

  } catch (error) {
    console.error('Create error:', error)
    alert('Error: ' + error.message)
  }
}

 const joinCouple = async () => {
  if (!joinName.trim()) {
    alert('Please enter your name')
    return
  }

  if (!code || code.length !== 6) {
    alert('Please enter a valid code')
    return
  }

  try {
    const upperCode = code.toUpperCase().trim()

    // Check if already in relationship
    const { data: existingRelationship } = await supabase
      .from('couples')
      .select('*')
      .or(`partner1_id.eq.${user.id},partner2_id.eq.${user.id}`)

    if (existingRelationship && existingRelationship.length > 0) {
      alert('You are already in a relationship. Unlink first.')
      return
    }

    // Find couple
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

    // Join relationship
    const { error: updateError } = await supabase
      .from('couples')
      .update({
        partner2_id: user.id,
        partner2_name: joinName.trim()
      })
      .eq('id', targetCouple.id)

    if (updateError) throw updateError

    // Create balance
    await supabase.from('balances').insert({
      couple_id: targetCouple.id,
      user_id: user.id,
      balance: 100
    })

    onClose()
    alert('Successfully joined!')
    location.reload(true)

  } catch (error) {
    console.error('Join error:', error)
    alert('Error: ' + error.message)
  }
}

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pairingCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (coupleData && pairingCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <h2 className="text-2xl font-bold text-center mb-6 text-pink-600">Share This Code</h2>
          <div className="bg-purple-50 p-6 rounded-lg text-center mb-4">
            <p className="text-sm text-gray-600 mb-2">Pairing Code:</p>
            <div className="flex items-center justify-center gap-2">
              <div className="text-3xl font-bold text-purple-600 tracking-wider">{pairingCode}</div>
              <button
                onClick={copyToClipboard}
                className="p-2 hover:bg-purple-100 rounded-lg transition"
              >
                {copied ? <Check size={20} className="text-green-600" /> : <Copy size={20} className="text-purple-600" />}
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 text-center mb-4">Waiting for partner to join...</p>
          <button onClick={onSignOut} className="w-full text-gray-600 py-2 hover:text-gray-800">
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  if (!mode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <h2 className="text-2xl font-bold text-center mb-6">Welcome to Lovebux!</h2>
          <div className="space-y-4">
            <button
              onClick={() => setMode('create')}
              className="w-full bg-pink-500 text-white py-4 rounded-lg font-semibold hover:bg-pink-600 flex items-center justify-center gap-2"
            >
              <Users size={20} />
              Create New Relationship
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full bg-purple-500 text-white py-4 rounded-lg font-semibold hover:bg-purple-600 flex items-center justify-center gap-2"
            >
              <Heart size={20} />
              Join Partner&apos;s Relationship
            </button>
            <button onClick={onSignOut} className="w-full text-gray-600 py-2 hover:text-gray-800">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'create') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <h2 className="text-2xl font-bold text-center mb-6 text-pink-600">Create Relationship</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 border rounded-lg"
                placeholder="Enter your name"
              />
            </div>
            <button
              onClick={createCouple}
              disabled={!name.trim()}
              className="w-full bg-pink-500 text-white py-3 rounded-lg font-semibold hover:bg-pink-600 disabled:bg-gray-300"
            >
              Create & Get Code
            </button>
            <button onClick={() => setMode(null)} className="w-full text-gray-600 py-2">Back</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <h2 className="text-2xl font-bold text-center mb-6 text-purple-600">Join Relationship</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
            disabled={!name.trim() || code.length !== 6}
            className="w-full bg-purple-500 text-white py-3 rounded-lg font-semibold hover:bg-purple-600 disabled:bg-gray-300"
          >
            Join Relationship
          </button>
          <button onClick={() => setMode(null)} className="w-full text-gray-600 py-2">Back</button>
        </div>
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
    
    // Poll for updates every 2 seconds to catch changes quickly
    const pollInterval = setInterval(() => {
      loadData()
    }, 2000)
    
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
  }, [])

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
      type: 'gift'
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
        type: 'redemption'
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
        type: 'bet'
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
          <p className="text-gray-600 mb-6">You're not in a relationship yet. Click Settings to create or join one.</p>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 px-8 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-700"
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

  const categories = ['All', 'Romance', 'Food', 'Entertainment', 'Chores', 'Personal', 'Luxury']
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
            <input
              type="text"
              value={myName}
              onChange={(e) => updatePartnerName(isPartner1, e.target.value)}
              className="text-2xl font-bold text-gray-800 mb-2 border-b-2 border-transparent hover:border-pink-300 focus:border-pink-500 outline-none bg-transparent w-full"
            />
            <div className="flex items-center justify-between">
              <span className="text-4xl font-bold text-pink-500">{myBalance}</span>
              <Heart className="text-pink-400" size={32} />
            </div>
            <p className="text-sm text-gray-500 mt-2">Lovebux</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-purple-200">
            <div className="text-2xl font-bold text-gray-800 mb-2">{partnerName}</div>
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
                  transactions.slice(0, 20).map(tx => (
                    <div key={tx.id} className="border-l-4 border-pink-400 pl-4 py-2">
                      <p className="font-semibold text-gray-800">{tx.reason}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString()}
                      </p>
                      <p className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </p>
                    </div>
                  ))
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
              <option value="Romance">Romance</option>
              <option value="Food">Food</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Chores">Chores</option>
              <option value="Personal">Personal</option>
              <option value="Luxury">Luxury</option>
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
              <option value={couple.partner1_id}>{couple.partner1_name}</option>
              <option value={couple.partner2_id}>{couple.partner2_name}</option>
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
  const [pairingCode, setPairingCode] = useState('')
  const [copied, setCopied] = useState(false)

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase()

  const createCouple = async () => {
    const newCode = generateCode()
    const { data, error } = await supabase
      .from('couples')
      .insert({
        partner1_id: user.id,
        partner1_name: name,
        pairing_code: newCode
      })
      .select()
      .single()

    if (!error) {
      await supabase.from('balances').insert({
        couple_id: data.id,
        user_id: user.id,
        balance: 100
      })

      const defaultRewards = [
        { name: 'Date Night Choice', cost: 50, description: 'Pick the next date activity', category: 'Romance' },
        { name: 'Cuddle Session', cost: 15, description: '30 min mandatory cuddle time', category: 'Romance' },
        { name: 'Love Letter', cost: 40, description: 'Receive a handwritten love letter', category: 'Romance' },
        { name: 'Breakfast in Bed', cost: 35, description: 'Get breakfast made and served', category: 'Food' },
        { name: 'Movie Choice', cost: 20, description: 'Choose tonight\'s movie', category: 'Entertainment' },
        { name: 'Dishes Pass', cost: 25, description: 'Skip doing dishes for a day', category: 'Chores' },
      ]

      for (const reward of defaultRewards) {
        await supabase.from('rewards').insert({
          couple_id: data.id,
          ...reward
        })
      }

      alert(`Relationship created! Share this code: ${newCode}`)
      onClose()
      
      // Force reload to show dashboard with pairing code visible
      setTimeout(() => {
        window.location.href = window.location.href
      }, 100)
      
      } catch (error) {
        console.error('Create couple error:', error)
        alert('Error creating relationship: ' + error.message)
      }
    }
  }

  const joinCouple = async () => {
    const { data: existingCouple } = await supabase
      .from('couples')
      .select('*')
      .eq('pairing_code', code.toUpperCase())
      .single()

    if (!existingCouple || existingCouple.partner2_id) {
      alert('Invalid or already used code!')
      return
    }

    await supabase
      .from('couples')
      .update({
        partner2_id: user.id,
        partner2_name: name
      })
      .eq('id', existingCouple.id)

    // Create balance
    await supabase.from('balances').insert({
      couple_id: targetCouple.id,
      user_id: user.id,
      balance: 100
    })
    
    // Success! Just close and let polling handle the rest
    alert('Successfully joined relationship!')
    onClose()
    
    } catch (error) {
      alert('Error: ' + error.message)
    }

const unlinkRelationship = async () => {
  if (!confirm('Are you sure you want to unlink from this relationship? This cannot be undone.')) {
    return
  }

  try {
    const isPartner1 = user.id === couple.partner1_id

    // Delete user's balance first
    await supabase
      .from('balances')
      .delete()
      .eq('couple_id', couple.id)
      .eq('user_id', user.id)

    if (isPartner1) {
      // If partner1 is leaving and partner2 exists, make partner2 the new partner1
      if (couple.partner2_id) {
        const { error } = await supabase
          .from('couples')
          .update({
            partner1_id: couple.partner2_id,
            partner1_name: couple.partner2_name,
            partner2_id: null,
            partner2_name: null
          })
          .eq('id', couple.id)
        
        if (error) throw error
      } else {
        // If no partner2, delete the entire couple and all related data immediately
        await supabase.from('transactions').delete().eq('couple_id', couple.id)
        await supabase.from('rewards').delete().eq('couple_id', couple.id)
        await supabase.from('balances').delete().eq('couple_id', couple.id)
        await supabase.from('couples').delete().eq('id', couple.id)
      }
    } else {
      // If partner2 is leaving, just remove them
      const { error } = await supabase
        .from('couples')
        .update({
          partner2_id: null,
          partner2_name: null
        })
        .eq('id', couple.id)
      
      if (error) throw error

      // Schedule deletion of unpaired relationship after 48 hours
      // For now, we'll just mark it but you could use a serverless function for delayed deletion
      // Since we don't have that, let's delete it immediately if it's been sitting unpaired
      const coupleAge = new Date() - new Date(couple.created_at)
      const hoursSinceCreation = coupleAge / (1000 * 60 * 60)
      
      // If the couple has been around for more than 1 hour and is now unpaired, delete it
      if (hoursSinceCreation > 1) {
        await supabase.from('transactions').delete().eq('couple_id', couple.id)
        await supabase.from('rewards').delete().eq('couple_id', couple.id)
        await supabase.from('balances').delete().eq('couple_id', couple.id)
        await supabase.from('couples').delete().eq('id', couple.id)
      }
    }

    alert('Successfully unlinked from relationship')
    onClose()
    window.location.reload()
  } catch (error) {
    console.error('Unlink error:', error)
    alert('Error unlinking: ' + error.message)
  }
}

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

        {couple && !showCreateMode && !showJoinMode && (
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
              onClick={unlinkRelationship}
              className="w-full bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600"
            >
              Unlink from Relationship
            </button>
          </div>
        )}

        {!couple && !showCreateMode && !showJoinMode && (
          <div className="space-y-4">
            <p className="text-gray-600 text-center mb-4">You're not in a relationship yet</p>
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
