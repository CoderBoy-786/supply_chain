import { Box, Paper, Typography } from '@mui/material';
import bgImg from '../../img/bg1.avif';
import { TextField, Button } from '@mui/material';
import { useEffect, useState } from 'react';
import { ethers } from "ethers";
import axios from 'axios';
import abi from '../../utils/Identeefi.json';
import QRCode from 'qrcode.react';
import dayjs from 'dayjs';
import useAuth from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Geocode from "react-geocode";

const getEthereumObject = () => window.ethereum;

const findMetaMaskAccount = async () => {
    try {
        const ethereum = getEthereumObject();
        if (!ethereum) {
            console.error("Make sure you have Metamask!");
            alert("Make sure you have Metamask!");
            return null;
        }
        const accounts = await ethereum.request({ method: "eth_accounts" });
        if (accounts.length !== 0) {
            return accounts[0];
        } else {
            console.error("No authorized account found");
            return null;
        }
    } catch (error) {
        console.error(error);
        return null;
    }
};

const AddProduct = () => {
    const [currentAccount, setCurrentAccount] = useState("");
    const [serialNumber, setSerialNumber] = useState("");
    const [name, setName] = useState("");
    const [brand, setBrand] = useState("");
    const [description, setDescription] = useState("");
    const [image, setImage] = useState({ file: [], filepreview: null });
    const [qrData, setQrData] = useState('');
    const [manuDate, setManuDate] = useState('');
    const [manuLatitude, setManuLatitude] = useState("");
    const [manuLongtitude, setManuLongtitude] = useState("");
    const [manuName, setManuName] = useState("");
    const [loading, setLoading] = useState("");
    const [manuLocation, setManuLocation] = useState("");
    const [isUnique, setIsUnique] = useState(true);

    const CONTRACT_ADDRESS = '0x72e2C635bD96ec276e290f0ae33Def374796A3a0';
    const contractABI = abi.abi;
    const { auth } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        findMetaMaskAccount().then(account => {
            if (account) {
                setCurrentAccount(account);
            }
        });
        getUsername();
        getCurrentTimeLocation();
    }, []);

    useEffect(() => {
        if (manuLatitude && manuLongtitude) {
            Geocode.setApiKey('AIzaSyBPL7Nc9zx0ILv_GUlKPpmPtkNx0hOJmSk');
            Geocode.fromLatLng(manuLatitude, manuLongtitude).then(
                (response) => {
                    const address = response.results[0].formatted_address;
                    setManuLocation(address.replace(/,/g, ';'));
                },
                (error) => {
                    console.error(error);
                }
            );
        }
    }, [manuLatitude, manuLongtitude]);

    const generateQRCode = async (serialNumber) => {
        const data = CONTRACT_ADDRESS + ',' + serialNumber;
        setQrData(data);
    };

    const downloadQR = () => {
        const canvas = document.getElementById("QRCode");
        const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `${serialNumber}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };

    const handleBack = () => navigate(-1);

    const handleImage = (e) => {
        setImage({
            ...image,
            file: e.target.files[0],
            filepreview: URL.createObjectURL(e.target.files[0])
        });
    };

    const getUsername = async () => {
        const res = await axios.get(`http://localhost:5000/profile/${auth.user}`);
        setManuName(res?.data[0].name);
    };

    const uploadImage = async (image) => {
        const data = new FormData();
        data.append("image", image.file);
        await axios.post("http://localhost:5000/upload/product", data, {
            headers: { "Content-Type": "multipart/form-data" }
        });
    };

    const registerProduct = async () => {
        const { ethereum } = window;
        if (ethereum) {
            const provider = new ethers.providers.Web3Provider(ethereum);
            const signer = provider.getSigner();
            const productContract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

            const registerTxn = await productContract.registerProduct(
                name,
                brand,
                serialNumber,
                description.replace(/,/g, ';'),
                image.file.name,
                manuName,
                manuLocation,
                manuDate.toString()
            );
            setLoading(`Mining (Register Product) ... ${registerTxn.hash}`);
            await registerTxn.wait();
            setLoading(`Mined (Register Product) -- ${registerTxn.hash}`);
            generateQRCode(serialNumber);
        } else {
            console.log("Ethereum object doesn't exist!");
        }
    };

    const getCurrentTimeLocation = () => {
        setManuDate(dayjs().unix());
        navigator.geolocation.getCurrentPosition((position) => {
            setManuLatitude(position.coords.latitude);
            setManuLongtitude(position.coords.longitude);
        });
    };

    const addProductDB = async () => {
        const profileData = JSON.stringify({
            "serialNumber": serialNumber,
            "name": name,
            "brand": brand,
        });

        await axios.post('http://localhost:5000/addproduct', profileData, {
            headers: { 'Content-Type': 'application/json' },
        });
    };

    const checkUnique = async () => {
        const res = await axios.get("http://localhost:5000/product/serialNumber");
        const existingSerialNumbers = res.data.map((product) => product.serialnumber);
        setIsUnique(!existingSerialNumbers.includes(serialNumber));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await checkUnique();
        if (isUnique) {
            await uploadImage(image);
            await addProductDB();
            setLoading("Please pay the transaction fee to update the product details...");
            await registerProduct();
        } else {
            alert("Serial Number already exists");
        }
    };

    return (
        <Box sx={{
            backgroundImage: `url(${bgImg})`,
            minHeight: "80vh",
            backgroundRepeat: "no-repeat",
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            zIndex: -2,
            overflowY: "scroll"
        }}>
            <Paper elevation={3} sx={{ width: "400px", margin: "auto", marginTop: "10%", marginBottom: "10%", padding: "3%", backgroundColor: "#e3eefc" }}>
                <Typography
                    variant="h2"
                    sx={{
                        textAlign: "center", marginBottom: "3%",
                        fontFamily: 'Gambetta', fontWeight: "bold", fontSize: "2.5rem"
                    }}
                >
                    Add Product
                </Typography>
                <form onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        error={!isUnique}
                        helperText={!isUnique ? "Serial Number already exists" : ""}
                        id="outlined-basic"
                        margin="normal"
                        label="Serial Number"
                        variant="outlined"
                        onChange={(e) => setSerialNumber(e.target.value)}
                        value={serialNumber}
                    />
                    <TextField
                        fullWidth
                        id="outlined-basic"
                        margin="normal"
                        label="Name"
                        variant="outlined"
                        onChange={(e) => setName(e.target.value)}
                        value={name}
                    />
                    <TextField
                        fullWidth
                        id="outlined-basic"
                        margin="normal"
                        label="Brand"
                        variant="outlined"
                        onChange={(e) => setBrand(e.target.value)}
                        value={brand}
                    />
                    <TextField
                        fullWidth
                        id="outlined-basic"
                        margin="normal"
                        label="Description"
                        variant="outlined"
                        multiline
                        minRows={2}
                        onChange={(e) => setDescription(e.target.value)}
                        value={description}
                    />
                    <Button
                        variant="outlined"
                        component="label"
                        fullWidth
                        sx={{ marginTop: "3%", marginBottom: "3%" }}
                    >
                        Upload Image
                        <input
                            type="file"
                            hidden
                            onChange={handleImage}
                        />
                    </Button>
                    {image.filepreview && (
                        <img src={image.filepreview} alt="preview" style={{ width: "100%", height: "100%" }} />
                    )}
                    {qrData && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '3%' }}>
                            <QRCode value={qrData} id="QRCode" />
                        </div>
                    )}
                    {qrData && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '3%' }}>
                            <Button
                                variant="outlined"
                                component="label"
                                fullWidth
                                sx={{ marginTop: "3%", marginBottom: "3%" }}
                                onClick={downloadQR}
                            >
                                Download
                            </Button>
                        </div>
                    )}
                    {loading && (
                        <Typography
                            variant="body2"
                            sx={{
                                textAlign: "center", marginTop: "3%"
                            }}
                        >
                            {loading}
                        </Typography>
                    )}
                    <Button
                        variant="contained"
                        type="submit"
                        sx={{ width: "100%", marginTop: "3%", backgroundColor: '#98b5d5', '&:hover': { backgroundColor: '#618dbd' } }}
                        onClick={getCurrentTimeLocation}
                    >
                        Add Product
                    </Button>
                    <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
                        <Button onClick={handleBack} sx={{ marginTop: "5%" }}>
                            Back
                        </Button>
                    </Box>
                </form>
            </Paper>
        </Box>
    );
}

export default AddProduct;
