import { Box, Paper, Typography, Autocomplete, TextField, Button } from '@mui/material';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { ethers } from 'ethers';
import axios from 'axios';
import Geocode from 'react-geocode';
import dayjs from 'dayjs';
import bgImg from '../../img/bg1.avif';
import abi from '../../utils/Identeefi.json';

const options = ["true", "false"];

const getEthereumObject = () => window.ethereum;

const findMetaMaskAccount = async () => {
    try {
        const ethereum = getEthereumObject();

        if (!ethereum) {
            console.error("Make sure you have Metamask!");
            return null;
        }

        const accounts = await ethereum.request({ method: 'eth_accounts' });
        if (accounts.length !== 0) {
            const account = accounts[0];
            console.log("Found an authorized account:", account);
            return account;
        } else {
            console.error("No authorized account found");
            return null;
        }
    } catch (error) {
        console.error(error);
        return null;
    }
};

const UpdateProductDetails = () => {
    const [currentAccount, setCurrentAccount] = useState("");
    const [currDate, setCurrDate] = useState(dayjs().unix());
    const [currLatitude, setCurrLatitude] = useState("");
    const [currLongitude, setCurrLongitude] = useState("");
    const [currName, setCurrName] = useState("");
    const [currLocation, setCurrLocation] = useState("");
    const [serialNumber, setSerialNumber] = useState("");
    const [isSold, setIsSold] = useState(false);
    const [loading, setLoading] = useState("");

    const CONTRACT_ADDRESS = '0x72e2C635bD96ec276e290f0ae33Def374796A3a0';
    const CONTRACT_ABI = abi.abi;

    const { auth } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const qrData = location.state?.qrData;

    useEffect(() => {
        if (qrData) {
            const data = qrData.split(",");
            setSerialNumber(data[1]);
        }

        findMetaMaskAccount().then((account) => {
            if (account) {
                setCurrentAccount(account);
            }
        });
    }, [qrData]);

    useEffect(() => {
        getUsername();
        getCurrentTimeLocation();
    }, []);

    useEffect(() => {
        if (currLatitude && currLongitude) {
            Geocode.setApiKey('AIzaSyBPL7Nc9zx0ILv_GUlKPpmPtkNx0hOJmSk');

            Geocode.fromLatLng(currLatitude, currLongitude).then(
                (response) => {
                    const address = response.results[0].formatted_address;
                    let city, state, country;
                    for (const component of response.results[0].address_components) {
                        for (const type of component.types) {
                            if (type === "locality") {
                                city = component.long_name;
                            } else if (type === "administrative_area_level_1") {
                                state = component.long_name;
                            } else if (type === "country") {
                                country = component.long_name;
                            }
                        }
                    }

                    setCurrLocation(address.replace(/,/g, ';'));
                    console.log("city, state, country: ", city, state, country);
                    console.log("address:", address);
                },
                (error) => {
                    console.error(error);
                }
            );
        }
    }, [currLatitude, currLongitude]);

    const getCurrentTimeLocation = () => {
        setCurrDate(dayjs().unix());
        navigator.geolocation.getCurrentPosition((position) => {
            setCurrLatitude(position.coords.latitude);
            setCurrLongitude(position.coords.longitude);
        });
    };

    const getUsername = async () => {
        try {
            const response = await axios.get(`http://localhost:5000/profile/${auth.user}`);
            setCurrName(response.data[0].name);
        } catch (error) {
            console.error("Error fetching username:", error);
        }
    };

    const updateProduct = async () => {
        try {
            const { ethereum } = window;

            if (ethereum) {
                const provider = new ethers.providers.Web3Provider(ethereum);
                const signer = provider.getSigner();
                const productContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

                const registerTxn = await productContract.addProductHistory(serialNumber, currName, currLocation, currDate.toString(), Boolean(isSold));
                console.log("Mining (Adding Product History) ...", registerTxn.hash);
                setLoading("Mining (Add Product History) ...");

                await registerTxn.wait();
                console.log("Mined (Add Product History) --", registerTxn.hash);
                setLoading("Mined (Add Product History) --");

                const product = await productContract.getProduct(serialNumber);
                console.log("Retrieved product...", product);
                setLoading("Done! Product details updated successfully!");
            } else {
                console.log("Ethereum object doesn't exist!");
            }
        } catch (error) {
            console.error("Error updating product:", error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading("Please pay the transaction fee to update the product details...");
        await updateProduct();
    };

    const handleBack = () => {
        navigate(-1);
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
                    Update Product Details
                </Typography>

                <TextField
                    fullWidth
                    margin="normal"
                    label="Serial Number"
                    disabled
                    value={serialNumber}
                />

                <TextField
                    fullWidth
                    margin="normal"
                    label="Name"
                    disabled
                    value={currName}
                />
                <TextField
                    fullWidth
                    margin="normal"
                    label="Location"
                    disabled
                    multiline
                    minRows={2}
                    value={currLocation.replace(/;/g, ",")}
                />
                <TextField
                    fullWidth
                    margin="normal"
                    label="Date"
                    disabled
                    value={dayjs(currDate * 1000).format("MMMM D, YYYY h:mm A")}
                />

                {auth.role !== "supplier" && (
                    <Autocomplete
                        disablePortal
                        options={options}
                        fullWidth
                        value={isSold}
                        onChange={(event, newVal) => setIsSold(newVal)}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                fullWidth
                                margin="normal"
                                label="Is Sold?"
                                variant="outlined"
                            />
                        )}
                    />
                )}

                {loading && (
                    <Typography variant="body2" sx={{ textAlign: "center", marginTop: "3%" }}>
                        {loading}
                    </Typography>
                )}

                <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
                    <Button
                        variant="contained"
                        type="submit"
                        onClick={handleSubmit}
                        sx={{
                            textAlign: "center",
                            width: "50%",
                            marginTop: "3%",
                            backgroundColor: '#98b5d5',
                            '&:hover': { backgroundColor: '#618dbd' }
                        }}
                    >
                        Update Product
                    </Button>
                </Box>

                <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
                    <Button onClick={handleBack} sx={{ marginTop: "5%" }}>
                        Back
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
};

export default UpdateProductDetails;
