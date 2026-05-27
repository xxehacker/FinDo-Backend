import express from express;



const router = express;


router.get("/" , getAllFeedbacks)
router.post("/" , handleFeedBackStore)
// router.get("/" , getAllFeedbacks)
// router.get("/" , getAllFeedbacks)


export default router